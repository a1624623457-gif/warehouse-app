"use client";

import { Sidebar } from "./Sidebar";
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Calculator, Download } from "lucide-react";

interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
  sortOrder: number;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [totalValueOpen, setTotalValueOpen] = useState(false);
  const [totalValueData, setTotalValueData] = useState<any>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch("/api/zones");
      if (!res.ok) return;
      const data = await res.json();
      setZones(data || []);
    } catch (e) {
      console.error("Failed to fetch zones", e);
    }
  };

  const fetchTotalValue = async () => {
    try {
      const res = await fetch("/api/total-value");
      if (res.ok) {
        const data = await res.json();
        setTotalValueData(data);
        setTotalValueOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch("/api/export-excel");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `warehouse-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("下载失败", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar zones={zones} onZoneAdded={fetchZones} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex-1 flex justify-center lg:justify-start">
              <GlobalSearchBar />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              {isAdmin && (
                <div className="flex items-center gap-2 mr-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTotalValue}
                    title="总库值计算"
                  >
                    <Calculator size={16} className="mr-1" />
                    总库值
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    title="下载Excel"
                  >
                    <Download size={16} className="mr-1" />
                    下载
                  </Button>
                </div>
              )}
              <span className="font-medium">库存助手</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Total Value Modal */}
      {totalValueOpen && totalValueData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setTotalValueOpen(false)} />
          <div className="relative z-50 w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg bg-white shadow-xl mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">总库值计算</h3>
            <p className="text-sm text-gray-500 mb-4">
              统计范围：所有非零库存产品（库存数量 &gt; 0）
            </p>

            <div className="space-y-3 mb-6">
              {totalValueData.zoneSummaries.map((zs: any) => (
                <div key={zs.zoneName} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-gray-700">{zs.zoneName}区</span>
                    <span className="text-xs text-gray-400 ml-2">{zs.productCount} 个产品</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ¥{zs.totalValue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">总库值</span>
              <span className="text-2xl font-bold text-blue-700">
                ¥{totalValueData.grandTotal.toLocaleString()}
              </span>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setTotalValueOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
