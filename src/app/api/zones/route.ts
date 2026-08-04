import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const rows = db.prepare("SELECT * FROM zones ORDER BY sort_order").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可新增区域" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "请输入区域名称" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM zones WHERE name = ?").get(body.name.trim());
  if (existing) {
    return NextResponse.json({ error: "区域名称已存在" }, { status: 409 });
  }

  const maxOrder = db.prepare("SELECT MAX(sort_order) as maxOrder FROM zones").get() as any;
  const sortOrder = (maxOrder?.maxOrder || 0) + 1;

  const result = db.prepare(
    "INSERT INTO zones (name, is_fixed, is_virtual, sort_order) VALUES (?, 0, 0, ?)"
  ).run(body.name.trim(), sortOrder);

  const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(zone, { status: 201 });
}
