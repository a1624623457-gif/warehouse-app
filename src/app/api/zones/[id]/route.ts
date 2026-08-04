import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

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
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可修改区域" }, { status: 403 });
  }

  const db = getDb();
  const zoneId = parseInt(id);
  const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(zoneId) as any;

  if (!zone) {
    return NextResponse.json({ error: "区域不存在" }, { status: 404 });
  }

  if (zone.is_fixed) {
    return NextResponse.json({ error: "固定区域不可修改" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "请输入区域名称" }, { status: 400 });
  }

  db.prepare(
    "UPDATE zones SET name = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(body.name.trim(), zoneId);

  const updated = db.prepare("SELECT * FROM zones WHERE id = ?").get(zoneId);
  return NextResponse.json(updated);
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
    return NextResponse.json({ error: "仅管理员可删除区域" }, { status: 403 });
  }

  const db = getDb();
  const zoneId = parseInt(id);
  const zone = db.prepare("SELECT * FROM zones WHERE id = ?").get(zoneId) as any;

  if (!zone) {
    return NextResponse.json({ error: "区域不存在" }, { status: 404 });
  }

  if (zone.is_fixed) {
    return NextResponse.json({ error: "固定区域不可删除" }, { status: 403 });
  }

  db.prepare("DELETE FROM zones WHERE id = ?").run(zoneId);
  return NextResponse.json({ success: true });
}
