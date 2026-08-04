"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Package, X } from "lucide-react";

interface ProductDetail {
  id: number;
  name: string;
  model: string;
  specTypeId: number | null;
  specTypeLabel?: string;
  imageUrl: string | null;
  expiryDate: string | null;
  unitPrice: number | null;
  zoneId: number;
  zoneName?: string;
  shelfId?: number | null;
  shelfName?: string;
  todayIn: number;
  todayOut: number;
  currentStock: number;
  notes: string | null;
}

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetail | null;
  onEdit: () => void;
  onDelete?: () => void;
  canEdit: boolean;
  isAdmin: boolean;
}

function getExpiryStatus(
  expiryDate: string | null
): "expired" | "near_expiry" | "ok" {
  if (!expiryDate) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const days15Later = new Date(today);
  days15Later.setDate(days15Later.getDate() + 15);
  if (expiry < days15Later) return "expired";
  const sixMonthsEnd = new Date(today.getFullYear(), today.getMonth() + 7, 0);
  if (expiry <= sixMonthsEnd) return "near_expiry";
  return "ok";
}

export function ProductDetailModal({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
  canEdit,
  isAdmin,
}: ProductDetailModalProps) {
  if (!product || !open) return null;

  const expiryStatus = getExpiryStatus(product.expiryDate);
  const statusConfig: Record<string, { label: string; className: string }> = {
    expired: { label: "已过期", className: "bg-red-100 text-red-700" },
    near_expiry: { label: "临期", className: "bg-amber-100 text-amber-700" },
    ok: { label: "正常", className: "bg-green-100 text-green-700" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">产品详情</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          <div className="space-y-4">
            {/* Image */}
            <div className="aspect-video rounded-lg bg-gray-100 overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Package size={48} />
                  <span className="text-sm mt-2">暂无图片</span>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="产品名称" value={product.name} />
              <DetailField label="型号" value={product.model || "-"} />
              <DetailField
                label="有效期"
                value={
                  product.expiryDate ? (
                    <span className="flex items-center gap-2">
                      {product.expiryDate}
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          statusConfig[expiryStatus].className
                        )}
                      >
                        {statusConfig[expiryStatus].label}
                      </span>
                    </span>
                  ) : (
                    "未设置"
                  )
                }
              />
              <DetailField
                label="单价"
                value={product.unitPrice != null ? `¥${product.unitPrice}` : "-"}
              />
              <DetailField
                label="存放区域"
                value={`${product.zoneName || "未知"}区${product.shelfName ? " - 货架 " + product.shelfName : ""}`}
              />
              <DetailField
                label="累计入库"
                value={product.todayIn?.toString() || "0"}
                highlight
              />
              <DetailField
                label="累计出库"
                value={product.todayOut?.toString() || "0"}
                highlight
              />
              <DetailField
                label="当前库存"
                value={product.currentStock?.toString() || "0"}
                highlight
              />
            </div>

            {product.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">备注</p>
                <p className="text-sm text-gray-700">{product.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-2 border-t">
          {isAdmin && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              删除产品
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {canEdit && (
            <Button onClick={onEdit}>
              修改
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p
        className={cn(
          "text-sm",
          highlight ? "text-blue-700 font-semibold" : "text-gray-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
