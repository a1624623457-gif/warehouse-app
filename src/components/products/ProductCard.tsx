"use client";

import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    model: string;
    imageUrl: string | null;
    currentStock: number;
    shelfName?: string;
    zoneName?: string;
  };
  onClick: () => void;
  highlighted?: boolean;
}

export function ProductCard({ product, onClick, highlighted }: ProductCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left hover:shadow-md hover:border-blue-300 transition-all group flex flex-col",
        highlighted && "ring-2 ring-blue-500 shadow-md border-blue-400"
      )}
    >
      {/* Product image */}
      <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden mb-3 relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <Package size={40} />
            <span className="text-xs mt-2">暂无图片</span>
          </div>
        )}
      </div>

      {/* Product info */}
      <h3 className="font-medium text-gray-900 text-sm truncate">
        {product.name}
      </h3>
      <p className="text-xs text-gray-500 mt-1 truncate">{product.model}</p>

      {/* Shelf info - always show zone name even without specific shelf */}
      <p className="text-xs text-blue-600 mt-0.5 font-medium min-h-[1rem]">
        货架: {product.shelfName || product.zoneName || '-'}
      </p>

      {/* Stock badge */}
      <div className="mt-auto pt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">当前库存</span>
        <span
          className={cn(
            "text-sm font-bold",
            product.currentStock > 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {product.currentStock}
        </span>
      </div>
    </button>
  );
}
