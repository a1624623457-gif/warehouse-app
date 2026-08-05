"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, Lock, Globe, AlertTriangle, Clock, ChevronUp, ChevronDown } from "lucide-react";

interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
  sortOrder: number;
}

export default function ZoneManagementPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Zone | null>(null);

  useEffect(() => {
    if (session) fetchZones();
  }, [session]);

  const fetchZones = async () => {
    try {
      const res = await fetch("/api/zones");
      const data = await res.json();
      setZones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditZone(null);
    setZoneName("");
    setDialogOpen(true);
  };

  const handleEdit = (zone: Zone) => {
    setEditZone(zone);
    setZoneName(zone.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!zoneName.trim()) {
      showToast("请输入区域名称", "error");
      return;
    }

    setSaving(true);
    try {
      if (editZone) {
        const res = await fetch(`/api/zones/${editZone.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: zoneName.trim() }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("区域已重命名", "success");
      } else {
        const res = await fetch("/api/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: zoneName.trim(),
            isFixed: false,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("区域已创建", "success");
      }
      setDialogOpen(false);
      fetchZones();
    } catch (e: any) {
      showToast(e.message || "操作失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (zone: Zone) => {
    setDeleteConfirm(zone);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/zones/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("区域已删除", "success");
      setDeleteConfirm(null);
      fetchZones();
    } catch (e: any) {
      showToast(e.message || "操作失败", "error");
    }
  };

  const handleMove = async (zone: Zone, direction: "up" | "down") => {
    try {
      const res = await fetch("/api/zones/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId: zone.id, direction }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "移动失败", "error");
        return;
      }
      const data = await res.json();
      setZones(data);
    } catch (e: any) {
      showToast("移动失败", "error");
    }
  };

  const realZones = zones.filter((z) => !z.isVirtual);
  const virtualZones = zones.filter((z) => z.isVirtual);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">区域管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理仓库存储区域</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-1" />
          新增区域
        </Button>
      </div>

      {/* Physical zones */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          <Globe size={18} className="inline mr-2" />
          物理区域
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  区域名称
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  类型
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  排序
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  顺序
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {realZones.map((zone) => (
                <tr
                  key={zone.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {zone.name}区
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {zone.isFixed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Lock size={12} />
                        固定区域
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        可修改
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {zone.sortOrder}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMove(zone, "up")}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="上移"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(zone, "down")}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="下移"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!zone.isFixed && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(zone)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="重命名"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(zone)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Virtual zones */}
      {virtualZones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            <Clock size={18} className="inline mr-2" />
            系统虚拟区域
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    区域名称
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    类型
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    说明
                  </th>
                </tr>
              </thead>
              <tbody>
                {virtualZones.map((zone) => (
                  <tr key={zone.id} className="border-b border-gray-100">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {zone.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        <Lock size={12} />
                        系统区域
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {zone.name === "临期"
                        ? "根据产品有效期自动归类"
                        : zone.name === "过期"
                        ? "根据过期规则自动归类"
                        : zone.name === "零库存"
                        ? "库存为0的产品自动归入"
                        : "系统区域"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>
            {editZone ? "重命名区域" : "新增区域"}
          </DialogTitle>
          <DialogClose onClick={() => setDialogOpen(false)} />
        </DialogHeader>
        <DialogContent>
          <div>
            <Label>区域名称</Label>
            <Input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="例如：E、F、G..."
            />
            <p className="text-xs text-gray-400 mt-1">
              建议使用单个大写字母（A-Z），新增区域默认可修改和删除
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            确认删除区域
          </DialogTitle>
          <DialogClose onClick={() => setDeleteConfirm(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="py-2">
            <p className="text-gray-700">
              您确定要删除区域
              <span className="font-bold text-red-600 mx-1">
                「{deleteConfirm?.name}区」
              </span>
              吗？
            </p>
            <p className="text-sm text-gray-500 mt-2">
              删除后该区域下的产品将失去区域归属。此操作不可恢复。
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm(null)}
          >
            取消
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm}>
            确认删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
