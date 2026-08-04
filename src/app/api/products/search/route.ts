import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const likePattern = `%${q}%`;

  // Use LIKE search for Chinese + mixed content (FTS5 default tokenizer can't handle CJK)
  // Split query into individual characters for better matching
  const chars = q.split("").filter((c) => c.trim().length > 0);
  let rows;

  if (chars.length === 1) {
    // Single character: direct LIKE
    rows = db.prepare(`
      SELECT p.id, p.name, p.model, p.image_url as imageUrl, p.current_stock as currentStock,
             p.zone_id as zoneId, z.name as zoneName, sh.name as shelfName
      FROM products p
      LEFT JOIN zones z ON p.zone_id = z.id
      LEFT JOIN shelves sh ON p.shelf_id = sh.id
      WHERE p.name LIKE ? OR p.model LIKE ?
      ORDER BY p.updated_at DESC
      LIMIT 20
    `).all(likePattern, likePattern);
  } else {
    // Multi-char: try both whole-string LIKE and per-char matching
    // Build a query that matches products containing ALL characters (in any order)
    const charConditions = chars
      .map(() => `(p.name LIKE ? OR p.model LIKE ?)`)
      .join(" AND ");
    const charParams: string[] = [];
    chars.forEach((c) => {
      charParams.push(`%${c}%`, `%${c}%`);
    });

    // Use whole-string LIKE first, with per-char AND as secondary filter
    const sql = `
      SELECT p.id, p.name, p.model, p.image_url as imageUrl, p.current_stock as currentStock,
             p.zone_id as zoneId, z.name as zoneName, sh.name as shelfName
      FROM products p
      LEFT JOIN zones z ON p.zone_id = z.id
      LEFT JOIN shelves sh ON p.shelf_id = sh.id
      WHERE (p.name LIKE ? OR p.model LIKE ?)
        AND ${charConditions}
      ORDER BY p.updated_at DESC
      LIMIT 20
    `;

    rows = db.prepare(sql).all(likePattern, likePattern, ...charParams);

    // If no results, fall back to just whole-string LIKE
    if (rows.length === 0) {
      rows = db.prepare(`
        SELECT p.id, p.name, p.model, p.image_url as imageUrl, p.current_stock as currentStock,
               p.zone_id as zoneId, z.name as zoneName, sh.name as shelfName
        FROM products p
        LEFT JOIN zones z ON p.zone_id = z.id
        LEFT JOIN shelves sh ON p.shelf_id = sh.id
        WHERE p.name LIKE ? OR p.model LIKE ?
        ORDER BY p.updated_at DESC
        LIMIT 20
      `).all(likePattern, likePattern);
    }
  }

  return NextResponse.json(rows);
}
