"use client";

import { Sidebar } from "./Sidebar";
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";
import { useEffect, useState } from "react";

interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
  sortOrder: number;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);

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
              <span className="font-medium">库存助手</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
