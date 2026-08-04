import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可查看用户列表" }, { status: 403 });
  }

  const db = getDb();
  const rows = db.prepare(
    "SELECT id, username, role, display_name as displayName, is_active as isActive, created_at as createdAt FROM users ORDER BY created_at"
  ).all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可创建用户" }, { status: 403 });
  }

  const body = await req.json();

  if (!body.username?.trim() || !body.password?.trim() || !body.displayName?.trim()) {
    return NextResponse.json(
      { error: "用户名、密码和显示名称不能为空" },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(body.username.trim());
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const hash = await bcrypt.hash(body.password, 10);

  const result = db.prepare(
    "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
  ).run(body.username.trim(), hash, body.role || "viewer", body.displayName.trim());

  const user = db.prepare(
    "SELECT id, username, role, display_name as displayName FROM users WHERE id = ?"
  ).get(result.lastInsertRowid);

  return NextResponse.json(user, { status: 201 });
}
