import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zoneId");
  const shelfId = searchParams.get("shelfId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");

  const db = getDb();
  let rows: any[];

  if (zoneId) {
    const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(parseInt(zoneId)) as any;

    if (zone?.is_virtual) {
      if (zone.name === "过期") {
        rows = db.prepare(`
          SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
          FROM products p
          LEFT JOIN zones z ON p.zone_id = z.id
          LEFT JOIN spec_types s ON p.spec_type_id = s.id
          LEFT JOIN shelves sh ON p.shelf_id = sh.id
          WHERE p.expiry_date IS NOT NULL
            AND date(p.expiry_date) < date('now', '+15 days')
          ORDER BY p.updated_at DESC
          LIMIT ? OFFSET ?
        `).all(limit, (page - 1) * limit);
      } else if (zone.name === "临期") {
        rows = db.prepare(`
          SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
          FROM products p
          LEFT JOIN zones z ON p.zone_id = z.id
          LEFT JOIN spec_types s ON p.spec_type_id = s.id
          LEFT JOIN shelves sh ON p.shelf_id = sh.id
          WHERE p.expiry_date IS NOT NULL
            AND date(p.expiry_date) >= date('now', '+15 days')
            AND date(p.expiry_date) <= date('now', 'start of month', '+7 months', '-1 day')
          ORDER BY p.updated_at DESC
          LIMIT ? OFFSET ?
        `).all(limit, (page - 1) * limit);
      } else {
        rows = [];
      }
    } else if (shelfId) {
      // Filter by specific shelf within a zone
      rows = db.prepare(`
        SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
        FROM products p
        LEFT JOIN zones z ON p.zone_id = z.id
        LEFT JOIN spec_types s ON p.spec_type_id = s.id
        LEFT JOIN shelves sh ON p.shelf_id = sh.id
        WHERE p.zone_id = ? AND p.shelf_id = ?
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `).all(parseInt(zoneId), parseInt(shelfId), limit, (page - 1) * limit);
    } else {
      rows = db.prepare(`
        SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
        FROM products p
        LEFT JOIN zones z ON p.zone_id = z.id
        LEFT JOIN spec_types s ON p.spec_type_id = s.id
        LEFT JOIN shelves sh ON p.shelf_id = sh.id
        WHERE p.zone_id = ?
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `).all(parseInt(zoneId), limit, (page - 1) * limit);
    }
  } else if (search) {
    rows = db.prepare(`
      SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
      FROM products p
      LEFT JOIN zones z ON p.zone_id = z.id
      LEFT JOIN spec_types s ON p.spec_type_id = s.id
      LEFT JOIN shelves sh ON p.shelf_id = sh.id
      WHERE p.name LIKE ? OR p.model LIKE ?
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(`%${search}%`, `%${search}%`, limit, (page - 1) * limit);
  } else {
    rows = db.prepare(`
      SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
      FROM products p
      LEFT JOIN zones z ON p.zone_id = z.id
      LEFT JOIN spec_types s ON p.spec_type_id = s.id
      LEFT JOIN shelves sh ON p.shelf_id = sh.id
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, (page - 1) * limit);
  }

  const products = rows.map(mapProduct);
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json();
  const userId = parseInt((session.user as any).id);
  const db = getDb();

  const todayIn = body.todayIn || 0;
  const todayOut = body.todayOut || 0;
  const currentStock = todayIn - todayOut;

  // Resolve shelf: if shelfName is provided, find existing or create new
  let shelfId = null;
  if (body.shelfName && body.zoneId) {
    const existingShelf = db.prepare(
      "SELECT id FROM shelves WHERE name = ? AND zone_id = ?"
    ).get(body.shelfName, body.zoneId) as any;
    if (existingShelf) {
      shelfId = existingShelf.id;
    } else {
      const result = db.prepare(
        "INSERT INTO shelves (name, zone_id) VALUES (?, ?)"
      ).run(body.shelfName, body.zoneId);
      shelfId = result.lastInsertRowid;
    }
  }

  const result = db.prepare(`
    INSERT INTO products (name, model, spec_type_id, image_url, expiry_date, unit_price, zone_id, shelf_id, today_in, today_out, current_stock, notes, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name,
    body.model || "",
    body.specTypeId || null,
    body.imageUrl || null,
    body.expiryDate || null,
    body.unitPrice || null,
    body.zoneId,
    shelfId,
    todayIn,
    todayOut,
    currentStock,
    body.notes || null,
    userId,
    userId
  );

  const productId = result.lastInsertRowid;

  if (todayIn > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, user_id, change_type, quantity, notes)
      VALUES (?, ?, 'in', ?, '初始入库')
    `).run(productId, userId, todayIn);
  }
  if (todayOut > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, user_id, change_type, quantity, notes)
      VALUES (?, ?, 'out', ?, '初始出库')
    `).run(productId, userId, todayOut);
  }

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
  return NextResponse.json(mapProduct(product), { status: 201 });
}

function mapProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    specTypeId: row.spec_type_id,
    imageUrl: row.image_url,
    expiryDate: row.expiry_date,
    unitPrice: row.unit_price,
    zoneId: row.zone_id,
    shelfId: row.shelf_id,
    shelfName: row.shelfName,
    todayIn: row.today_in,
    todayOut: row.today_out,
    currentStock: row.current_stock,
    notes: row.notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    zoneName: row.zoneName,
    specTypeLabel: row.specTypeLabel,
  };
}
