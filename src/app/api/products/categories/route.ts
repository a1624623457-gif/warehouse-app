import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const rows = db.prepare(
    "SELECT DISTINCT model FROM products WHERE model != '' ORDER BY model"
  ).all() as { model: string }[];

  const categories = rows.map((r) => r.model);
  return NextResponse.json(categories);
}
