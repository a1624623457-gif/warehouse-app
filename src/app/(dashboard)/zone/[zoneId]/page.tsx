"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Plus, Package, Filter } from "lucide-react";

interface Product {
  id: number;
  name: string;
  model: string;
  imageUrl: string | null;
  currentStock: number;
  zoneId: number;
  zoneName: string;
  shelfId?: number | null;
  shelfName?: string;
  specTypeLabel?: string;
  expiryDate: string | null;
  unitPrice: number | null;
  todayIn: number;
  todayOut: number;
  notes: string | null;
  specTypeId: number | null;
}

interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
}

interface Shelf {
  id: number;
  name: string;
  zone_id: number;
}

function ZoneProductsContent() {
  const { zoneId } = useParams();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [zone, setZone] = useState<Zone | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editData, setEditData] = useState<any>(null);
  const [lockToken, setLockToken] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(
    highlightId
  );

  const role = (session?.user as any)?.role;
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/products?zoneId=${zoneId}&limit=100`;
      if (selectedShelfId) {
        url += `&shelfId=${selectedShelfId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [zoneId, selectedShelfId]);

  const fetchZone = useCallback(async () => {
    try {
      const res = await fetch("/api/zones");
      const data = await res.json();
      const found = data.find((z: Zone) => z.id === parseInt(zoneId as string));
      setZone(found || null);
    } catch (e) {
      console.error(e);
    }
  }, [zoneId]);

  const fetchShelves = useCallback(async () => {
    try {
      const res = await fetch(`/api/shelves?zoneId=${zoneId}`);
      const data = await res.json();
      setShelves(data);
    } catch (e) {
      console.error(e);
    }
  }, [zoneId]);

  useEffect(() => {
    fetchProducts();
    fetchZone();
    fetchShelves();
  }, [fetchProducts, fetchZone, fetchShelves]);

  // Handle highlight from search
  useEffect(() => {
    if (highlightId) {
      setHighlightedId(highlightId);
      setTimeout(() => {
        const el = document.getElementById(`product-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [highlightId]);

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

  const handleAdd = () => {
    const defaultZoneId = parseInt(zoneId as string);
    if (zone && !zone.isVirtual) {
      setEditData({ zoneId: defaultZoneId });
    } else {
      setEditData({});
    }
    setFormMode("add");
    setFormOpen(true);
  };

  const handleSave = async (data: any) => {
    if (formMode === "add") {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "创建失败");
      }
    } else {
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
    }
    await fetchProducts();
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    if (!confirm(`确定要删除产品「${selectedProduct.name}」吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "删除失败");
      }
      showToast("产品已删除", "success");
      setDetailOpen(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (e: any) {
      showToast(e.message || "删除失败", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {zone?.name || "区域"}
            {!zone?.isVirtual && "区"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {products.length} 个产品
          </p>
        </div>
        {isAdmin && !zone?.isVirtual && (
          <Button onClick={handleAdd} size="md">
            <Plus size={18} className="mr-1" />
            添加产品
          </Button>
        )}
        {role === "editor" && !zone?.isVirtual && (
          <span className="text-sm text-gray-400 italic">编辑者可修改产品</span>
        )}
        {zone?.isVirtual && (
          <div className="text-sm text-gray-400 italic">
            {zone.name === "零库存" ? "库存为0的产品自动归入此区域" : "系统自动归类"}
          </div>
        )}
      </div>

      {/* Shelf filter */}
      {!zone?.isVirtual && shelves.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedShelfId}
            onChange={(e) => setSelectedShelfId(e.target.value)}
            className="h-9 rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">全部货架</option>
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id.toString()}>
                货架 {shelf.name}
              </option>
            ))}
          </select>
          {selectedShelfId && (
            <button
              onClick={() => setSelectedShelfId("")}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package size={64} className="mb-4" />
          <p className="text-lg font-medium">暂无产品</p>
          <p className="text-sm mt-1">
            {isAdmin ? '点击右上角"添加产品"按钮' : "暂无产品数据"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product) => (
            <div key={product.id} id={`product-${product.id}`}>
              <ProductCard
                product={product}
                onClick={() => handleCardClick(product)}
                highlighted={highlightedId === product.id.toString()}
                showPrice={isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      <ProductDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        product={selectedProduct}
        onEdit={handleEdit}
        onDelete={isAdmin ? handleDelete : undefined}
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

export default function ZoneProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <ZoneProductsContent />
    </Suspense>
  );
}
