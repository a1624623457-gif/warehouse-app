import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可查看库值" }, { status: 403 });
  }

  const db = getDb();

  // Get all products not in zero-stock zone
  const products = db.prepare(`
    SELECT p.name, p.model, p.unit_price, p.current_stock, z.name as zoneName
    FROM products p
    LEFT JOIN zones z ON p.zone_id = z.id
    WHERE p.current_stock > 0
    ORDER BY z.sort_order, p.name
  `).all() as { name: string; model: string; unit_price: number | null; current_stock: number; zoneName: string }[];

  // Group by zone
  const zoneMap: Record<string, { products: any[]; totalValue: number }> = {};
  let grandTotal = 0;

  for (const p of products) {
    const zoneName = p.zoneName || "未知";
    if (!zoneMap[zoneName]) {
      zoneMap[zoneName] = { products: [], totalValue: 0 };
    }
    const value = (p.unit_price || 0) * p.current_stock;
    zoneMap[zoneName].products.push({
      name: p.name,
      model: p.model || "",
      unitPrice: p.unit_price,
      currentStock: p.current_stock,
      value: parseFloat(value.toFixed(2)),
    });
    zoneMap[zoneName].totalValue += value;
    grandTotal += value;
  }

  // Format for display
  const zoneSummaries = Object.entries(zoneMap).map(([zoneName, data]) => ({
    zoneName,
    productCount: data.products.length,
    totalValue: parseFloat(data.totalValue.toFixed(2)),
  }));

  return NextResponse.json({
    zoneSummaries,
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    totalProducts: products.length,
  });
}
