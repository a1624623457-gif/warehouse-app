import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const rows = db.prepare("SELECT * FROM spec_types ORDER BY category, label").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可管理规格类型" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.category?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "类别和规格值不能为空" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO spec_types (category, label) VALUES (?, ?)"
  ).run(body.category.trim(), body.label.trim());

  const spec = db.prepare("SELECT * FROM spec_types WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(spec, { status: 201 });
}
