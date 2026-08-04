import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const db = getDb();
  let rows: any[];

  if (productId) {
    rows = db.prepare(`
      SELECT s.*, u.display_name as userDisplayName, p.name as productName
      FROM stock_movements s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.product_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(productId), limit, (page - 1) * limit);
  } else {
    rows = db.prepare(`
      SELECT s.*, u.display_name as userDisplayName, p.name as productName
      FROM stock_movements s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, (page - 1) * limit);
  }

  return NextResponse.json(rows);
}
