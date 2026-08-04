import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/shelves/[id]
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

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "请输入货架号" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE shelves SET name = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(body.name.trim(), parseInt(id));

  const shelf = db.prepare("SELECT * FROM shelves WHERE id = ?").get(parseInt(id));
  return NextResponse.json(shelf);
}

// DELETE /api/shelves/[id]
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
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const db = getDb();
  // Unlink products from this shelf first
  db.prepare("UPDATE products SET shelf_id = NULL WHERE shelf_id = ?").run(parseInt(id));
  db.prepare("DELETE FROM shelves WHERE id = ?").run(parseInt(id));

  return NextResponse.json({ success: true });
}
