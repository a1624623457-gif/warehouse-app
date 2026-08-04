import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/shelves?zoneId=1
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zoneId");

  let rows;
  if (zoneId) {
    rows = db.prepare(
      "SELECT * FROM shelves WHERE zone_id = ? ORDER BY name"
    ).all(parseInt(zoneId));
  } else {
    rows = db.prepare(
      "SELECT s.*, z.name as zoneName FROM shelves s LEFT JOIN zones z ON s.zone_id = z.id ORDER BY z.name, s.name"
    ).all();
  }

  return NextResponse.json(rows);
}

// POST /api/shelves
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
  if (!body.name?.trim() || !body.zoneId) {
    return NextResponse.json({ error: "货架名称和所属区域不能为空" }, { status: 400 });
  }

  const db = getDb();
  // Check duplicate
  const existing = db.prepare(
    "SELECT id FROM shelves WHERE name = ? AND zone_id = ?"
  ).get(body.name.trim(), body.zoneId);

  if (existing) {
    return NextResponse.json({ error: "该货架号在此区域已存在" }, { status: 409 });
  }

  const result = db.prepare(
    "INSERT INTO shelves (name, zone_id) VALUES (?, ?)"
  ).run(body.name.trim(), body.zoneId);

  const shelf = db.prepare("SELECT * FROM shelves WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(shelf, { status: 201 });
}
