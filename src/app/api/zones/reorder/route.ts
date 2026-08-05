import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json();
  const { zoneId, direction } = body; // direction: "up" or "down"

  if (!zoneId || !direction || !["up", "down"].includes(direction)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const db = getDb();
  const currentZone = db.prepare("SELECT * FROM zones WHERE id = ?").get(zoneId) as any;
  if (!currentZone) {
    return NextResponse.json({ error: "区域不存在" }, { status: 404 });
  }

  // Find the adjacent zone to swap sort_order with
  let neighborZone: any;
  if (direction === "up") {
    neighborZone = db.prepare(
      "SELECT * FROM zones WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1"
    ).get(currentZone.sort_order);
  } else {
    neighborZone = db.prepare(
      "SELECT * FROM zones WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1"
    ).get(currentZone.sort_order);
  }

  if (!neighborZone) {
    return NextResponse.json({ error: "无法移动，已到边界" }, { status: 400 });
  }

  // Swap sort orders
  const tempOrder = currentZone.sort_order;
  db.prepare("UPDATE zones SET sort_order = ? WHERE id = ?").run(neighborZone.sort_order, currentZone.id);
  db.prepare("UPDATE zones SET sort_order = ? WHERE id = ?").run(tempOrder, neighborZone.id);

  const zones = db.prepare("SELECT * FROM zones ORDER BY sort_order").all();
  return NextResponse.json(zones);
}
