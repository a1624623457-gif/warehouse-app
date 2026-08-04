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
    return NextResponse.json({ error: "仅管理员可修改用户" }, { status: 403 });
  }

  const db = getDb();
  const userId = parseInt(id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const body = await req.json();

  db.prepare(
    "UPDATE users SET role = ?, is_active = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    body.role ?? user.role,
    body.isActive !== undefined ? body.isActive : user.is_active,
    body.displayName ?? user.display_name,
    userId
  );

  const updated = db.prepare(
    "SELECT id, username, role, display_name as displayName, is_active as isActive FROM users WHERE id = ?"
  ).get(userId);

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
    return NextResponse.json({ error: "仅管理员可删除用户" }, { status: 403 });
  }

  const userId = parseInt(id);
  const sessionUserId = parseInt((session.user as any).id);

  if (userId === sessionUserId) {
    return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(userId);

  return NextResponse.json({ success: true });
}
