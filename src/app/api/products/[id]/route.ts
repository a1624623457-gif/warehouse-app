import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
    FROM products p
    LEFT JOIN zones z ON p.zone_id = z.id
    LEFT JOIN spec_types s ON p.spec_type_id = s.id
    LEFT JOIN shelves sh ON p.shelf_id = sh.id
    WHERE p.id = ?
  `).get(parseInt(id)) as any;

  if (!product) {
    return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  }

  return NextResponse.json(mapProduct(product));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const userId = parseInt((session.user as any).id);
  const productId = parseInt(id);
  const db = getDb();

  // Check edit lock
  const existingLock = db.prepare(
    "SELECT * FROM product_edit_locks WHERE product_id = ?"
  ).get(productId) as any;

  if (existingLock) {
    const lockExpired = new Date(existingLock.expires_at) < new Date();
    if (!lockExpired && existingLock.locked_by !== userId) {
      const lockedByUser = db.prepare(
        "SELECT display_name FROM users WHERE id = ?"
      ).get(existingLock.locked_by) as any;

      return NextResponse.json(
        {
          error: "PRODUCT_LOCKED",
          message: `产品正在由 ${lockedByUser?.display_name || "其他用户"} 编辑中，请稍后再试。`,
          lockedBy: lockedByUser?.display_name || "其他用户",
        },
        { status: 409 }
      );
    }
    if (lockExpired) {
      db.prepare("DELETE FROM product_edit_locks WHERE product_id = ?").run(productId);
    }
  }

  const body = await req.json();
  const oldProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;

  if (!oldProduct) {
    return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  }

  // todayIn/todayOut from the form represent NEW quantities to ADD to the cumulative totals
  const addIn = (body.todayIn && body.todayIn > 0) ? body.todayIn : 0;
  const addOut = (body.todayOut && body.todayOut > 0) ? body.todayOut : 0;

  const newTodayIn = oldProduct.today_in + addIn;
  const newTodayOut = oldProduct.today_out + addOut;
  const newStock = oldProduct.current_stock + addIn - addOut;

  // Resolve shelf: if shelfName is provided, find existing or create new
  let shelfId = (body.shelfId != null && body.shelfId !== "") ? body.shelfId : oldProduct.shelf_id;
  if (body.shelfName) {
    const zoneForShelf = body.zoneId != null && body.zoneId !== "" ? body.zoneId : oldProduct.zone_id;
    const existingShelf = db.prepare(
      "SELECT id FROM shelves WHERE name = ? AND zone_id = ?"
    ).get(body.shelfName, zoneForShelf) as any;
    if (existingShelf) {
      shelfId = existingShelf.id;
    } else {
      const result = db.prepare(
        "INSERT INTO shelves (name, zone_id) VALUES (?, ?)"
      ).run(body.shelfName, zoneForShelf);
      shelfId = result.lastInsertRowid;
    }
  }

  const zoneId = (body.zoneId != null && body.zoneId !== "" && !isNaN(body.zoneId)) ? body.zoneId : oldProduct.zone_id;

  db.prepare(`
    UPDATE products SET
      name = ?,
      model = ?,
      spec_type_id = ?,
      image_url = ?,
      expiry_date = ?,
      unit_price = ?,
      zone_id = ?,
      shelf_id = ?,
      today_in = ?,
      today_out = ?,
      current_stock = ?,
      notes = ?,
      updated_by = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.name ?? oldProduct.name,
    body.model ?? oldProduct.model,
    body.specTypeId !== undefined ? body.specTypeId : oldProduct.spec_type_id,
    body.imageUrl !== undefined ? body.imageUrl : oldProduct.image_url,
    body.expiryDate !== undefined ? body.expiryDate : oldProduct.expiry_date,
    body.unitPrice !== undefined ? body.unitPrice : oldProduct.unit_price,
    zoneId,
    shelfId,
    newTodayIn,
    newTodayOut,
    newStock,
    body.notes !== undefined ? body.notes : oldProduct.notes,
    userId,
    productId
  );

  // Log stock movements
  if (addIn > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, user_id, change_type, quantity, notes)
      VALUES (?, ?, 'in', ?, '本次入库')
    `).run(productId, userId, addIn);
  }
  if (addOut > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, user_id, change_type, quantity, notes)
      VALUES (?, ?, 'out', ?, '本次出库')
    `).run(productId, userId, addOut);
  }

  // Release lock
  db.prepare("DELETE FROM product_edit_locks WHERE product_id = ?").run(productId);

  const updated = db.prepare(`
    SELECT p.*, z.name as zoneName, s.label as specTypeLabel, sh.name as shelfName
    FROM products p
    LEFT JOIN zones z ON p.zone_id = z.id
    LEFT JOIN spec_types s ON p.spec_type_id = s.id
    LEFT JOIN shelves sh ON p.shelf_id = sh.id
    WHERE p.id = ?
  `).get(productId) as any;

  return NextResponse.json(mapProduct(updated));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可删除产品" }, { status: 403 });
  }

  const db = getDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(parseInt(id));

  return NextResponse.json({ success: true });
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
