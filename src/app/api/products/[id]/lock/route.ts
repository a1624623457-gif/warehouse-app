import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

  const existingLock = db.prepare(
    "SELECT * FROM product_edit_locks WHERE product_id = ?"
  ).get(productId) as any;

  if (existingLock) {
    const isExpired = new Date(existingLock.expires_at) < new Date();
    if (!isExpired) {
      if (existingLock.locked_by === userId) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        db.prepare(
          "UPDATE product_edit_locks SET expires_at = ? WHERE product_id = ?"
        ).run(expiresAt, productId);
        return NextResponse.json({ success: true, lockToken: existingLock.id });
      }

      const lockedByUser = db.prepare(
        "SELECT display_name FROM users WHERE id = ?"
      ).get(existingLock.locked_by) as any;

      return NextResponse.json(
        {
          error: "PRODUCT_LOCKED",
          message: `产品正在由 ${lockedByUser?.display_name || "其他用户"} 编辑中，请稍后再试。`,
        },
        { status: 409 }
      );
    }
    db.prepare("DELETE FROM product_edit_locks WHERE product_id = ?").run(productId);
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const result = db.prepare(
    "INSERT INTO product_edit_locks (product_id, locked_by, expires_at) VALUES (?, ?, ?)"
  ).run(productId, userId, expiresAt);

  return NextResponse.json({ success: true, lockToken: result.lastInsertRowid });
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

  const userId = parseInt((session.user as any).id);
  const productId = parseInt(id);
  const db = getDb();

  const lock = db.prepare(
    "SELECT * FROM product_edit_locks WHERE product_id = ?"
  ).get(productId) as any;

  if (lock && lock.locked_by === userId) {
    db.prepare("DELETE FROM product_edit_locks WHERE product_id = ?").run(productId);
  }

  return NextResponse.json({ success: true });
}
