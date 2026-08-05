"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";
import { Search, Package } from "lucide-react";

interface Product {
  id: number;
  name: string;
  model: string;
  imageUrl: string | null;
  currentStock: number;
  zoneId: number;
  zoneName: string;
  specTypeLabel?: string;
  expiryDate: string | null;
  unitPrice: number | null;
  todayIn: number;
  todayOut: number;
  notes: string | null;
  specTypeId: number | null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editData, setEditData] = useState<any>(null);
  const [lockToken, setLockToken] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState(q);

  const role = (session?.user as any)?.role;
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (q) searchProducts(q);
  }, [q, searchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch(
        `/api/products/${selectedProduct.id}/lock`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || "无法获取编辑锁", "error");
        return;
      }
      const lockData = await res.json();
      setLockToken(lockData.lockToken);
    } catch {
      showToast("获取编辑锁失败", "error");
      return;
    }
    setDetailOpen(false);
    setEditData(selectedProduct);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleReleaseLock = async () => {
    if (selectedProduct && lockToken) {
      try {
        await fetch(`/api/products/${selectedProduct.id}/lock`, {
          method: "DELETE",
        });
      } catch {}
      setLockToken(null);
    }
  };

  const handleSave = async (data: any) => {
    const res = await fetch(`/api/products/${selectedProduct!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || "更新失败");
    }
    await handleReleaseLock();
    searchProducts(q);
    setFormOpen(false);
  };

  const groupedProducts = products.reduce(
    (acc: Record<string, Product[]>, product) => {
      const key = product.zoneName || "未知";
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">搜索产品</h1>
        <form onSubmit={handleSearch}>
          <div className="relative max-w-2xl">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="搜索产品名称、产品类别..."
              className="w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 && q ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package size={64} className="mb-4" />
          <p className="text-lg font-medium">未找到匹配产品</p>
          <p className="text-sm mt-1">试试其他搜索词</p>
        </div>
      ) : (
        Object.entries(groupedProducts).map(([zoneName, zoneProducts]) => (
          <div key={zoneName} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              {zoneName}区
              <span className="text-sm text-gray-400 font-normal">
                ({zoneProducts.length} 个)
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {zoneProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleCardClick(product)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <ProductDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        product={selectedProduct}
        onEdit={handleEdit}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />

      <ProductForm
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) handleReleaseLock();
          setFormOpen(open);
        }}
        onSave={handleSave}
        initialData={editData}
        mode={formMode}
        lockToken={lockToken}
        onReleaseLock={handleReleaseLock}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
