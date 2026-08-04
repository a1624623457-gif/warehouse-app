"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Package,
  Home,
  Users,
  MapPin,
  Plus,
  AlertTriangle,
  Clock,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
  sortOrder: number;
}

interface SidebarProps {
  zones: Zone[];
  onZoneAdded?: () => void;
}

export function Sidebar({ zones, onZoneAdded }: SidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  const realZones = (zones || []).filter((z) => !z.isVirtual);
  const virtualZones = (zones || []).filter((z) => z.isVirtual);

  const navigateTo = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b flex items-center gap-2">
        <Package size={24} className="text-blue-600" />
        <span className="font-bold text-lg text-gray-900">库存助手</span>
      </div>

      {/* Zone navigation */}
      <div className="flex-1 overflow-auto py-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          仓库区域
        </div>
        {realZones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => navigateTo(`/zone/${zone.id}`)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              pathname === `/zone/${zone.id}`
                ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <MapPin size={16} />
            <span>{zone.name}区</span>
          </button>
        ))}

        {/* Virtual zones */}
        <div className="px-3 py-2 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          临期 / 过期
        </div>
        {virtualZones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => navigateTo(`/zone/${zone.id}`)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              pathname === `/zone/${zone.id}`
                ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            {zone.name === "临期" ? (
              <Clock size={16} className="text-amber-500" />
            ) : (
              <AlertTriangle size={16} className="text-red-500" />
            )}
            <span>{zone.name}</span>
          </button>
        ))}

        {/* Add zone button */}
        {isAdmin && (
          <button
            onClick={() => navigateTo("/admin/zones")}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors mt-2"
          >
            <Plus size={16} />
            <span>新增区域</span>
          </button>
        )}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="px-3 py-2 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              管理
            </div>
            <button
              onClick={() => navigateTo("/admin/users")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                pathname === "/admin/users"
                  ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Users size={16} />
              <span>用户管理</span>
            </button>
            <button
              onClick={() => navigateTo("/admin/zones")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                pathname === "/admin/zones"
                  ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <MapPin size={16} />
              <span>区域管理</span>
            </button>
          </>
        )}
      </div>

      {/* User info at bottom */}
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs">
            {(session?.user as any)?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-500">
              {(session?.user as any)?.role === "admin"
                ? "管理员"
                : (session?.user as any)?.role === "editor"
                ? "编辑者"
                : "查看者"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut size={16} />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-white shadow-md"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <SidebarContent />
      </div>
    </>
  );
}
