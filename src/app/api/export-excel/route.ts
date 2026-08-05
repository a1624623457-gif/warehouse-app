import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "仅管理员可导出数据" }, { status: 403 });
  }

  const db = getDb();

  // Get all non-virtual zones (physical zones only, excluding 零库存)
  const zones = db.prepare(`
    SELECT * FROM zones WHERE is_virtual = 0 OR name != '零库存'
    ORDER BY sort_order
  `).all() as { id: number; name: string }[];

  // Get zero-stock zone id for exclusion
  const zeroZone = db.prepare(
    "SELECT id FROM zones WHERE name = '零库存' AND is_virtual = 1"
  ).get() as { id: number } | undefined;

  // Get non-virtual zone ids
  const physicalZones = db.prepare(
    "SELECT id, name FROM zones WHERE is_virtual = 0 ORDER BY sort_order"
  ).all() as { id: number; name: string }[];

  // Also include 临期 and 过期 as sheets
  const virtualZones = db.prepare(
    "SELECT id, name FROM zones WHERE name IN ('临期', '过期') ORDER BY sort_order"
  ).all() as { id: number; name: string }[];

  const allZones = [...physicalZones, ...virtualZones];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "库存助手";
  workbook.created = new Date();

  let grandTotalValue = 0;

  for (const zone of allZones) {
    let products: any[];

    if (zone.name === "过期") {
      products = db.prepare(`
        SELECT p.name, p.model, p.unit_price, p.current_stock
        FROM products p
        WHERE p.expiry_date IS NOT NULL
          AND date(p.expiry_date) < date('now', '+15 days')
        ORDER BY p.name
      `).all();
    } else if (zone.name === "临期") {
      products = db.prepare(`
        SELECT p.name, p.model, p.unit_price, p.current_stock
        FROM products p
        WHERE p.expiry_date IS NOT NULL
          AND date(p.expiry_date) >= date('now', '+15 days')
          AND date(p.expiry_date) <= date('now', 'start of month', '+7 months', '-1 day')
        ORDER BY p.name
      `).all();
    } else {
      products = db.prepare(`
        SELECT p.name, p.model, p.unit_price, p.current_stock
        FROM products p
        WHERE p.zone_id = ? AND p.current_stock > 0
        ORDER BY p.name
      `).all(zone.id);
    }

    const sheet = workbook.addWorksheet(`${zone.name}区`);

    // Define columns
    sheet.columns = [
      { header: "产品名称", key: "name", width: 24 },
      { header: "产品类别", key: "model", width: 16 },
      { header: "成本价 (元)", key: "unitPrice", width: 14 },
      { header: "库存数量", key: "currentStock", width: 12 },
      { header: "库值 (元)", key: "value", width: 14 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    headerRow.alignment = { horizontal: "center" };
    headerRow.height = 22;

    let zoneTotalValue = 0;

    for (const p of products) {
      const unitPrice = p.unit_price || 0;
      const stock = p.current_stock || 0;
      const value = unitPrice * stock;

      sheet.addRow({
        name: p.name,
        model: p.model || "",
        unitPrice: unitPrice,
        currentStock: stock,
        value: parseFloat(value.toFixed(2)),
      });

      zoneTotalValue += value;
    }

    // Add summary row
    const summaryRow = sheet.addRow({
      name: "",
      model: "",
      unitPrice: "",
      currentStock: "区域小计:",
      value: parseFloat(zoneTotalValue.toFixed(2)),
    });
    summaryRow.font = { bold: true };
    summaryRow.alignment = { horizontal: "right" };

    grandTotalValue += zoneTotalValue;
  }

  // Add summary sheet
  const summarySheet = workbook.addWorksheet("库值汇总");
  summarySheet.columns = [
    { header: "项目", key: "item", width: 24 },
    { header: "金额 (元)", key: "amount", width: 16 },
  ];

  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  summarySheet.getRow(1).alignment = { horizontal: "center" };

  for (const zone of allZones) {
    let count: any;
    if (zone.name === "过期" || zone.name === "临期") {
      continue; // Skip virtual zones for summary per-sheet
    }
    // Calculate total for this zone
    let zoneTotal = 0;
    const products = db.prepare(`
      SELECT p.unit_price, p.current_stock
      FROM products p
      WHERE p.zone_id = ? AND p.current_stock > 0
    `).all(zone.id) as { unit_price: number | null; current_stock: number }[];

    for (const p of products) {
      zoneTotal += (p.unit_price || 0) * p.current_stock;
    }

    summarySheet.addRow({
      item: `${zone.name}区`,
      amount: parseFloat(zoneTotal.toFixed(2)),
    });
  }

  const totalRow = summarySheet.addRow({
    item: "总库值",
    amount: parseFloat(grandTotalValue.toFixed(2)),
  });
  totalRow.font = { bold: true, size: 14 };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="warehouse-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
