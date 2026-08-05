"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Zone {
  id: number;
  name: string;
  isVirtual: number;
}

interface Shelf {
  id: number;
  name: string;
  zone_id: number;
}

interface ProductFormData {
  name: string;
  model: string;
  specTypeId: number | null;
  imageUrl: string | null;
  expiryDate: string;
  unitPrice: string;
  zoneId: string;
  shelfId: string;
  todayIn: string;
  todayOut: string;
  notes: string;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Partial<ProductFormData> & { currentStock?: number; yesterdayStock?: number; shelfName?: string };
  mode: "add" | "edit";
  lockToken?: number | null;
  onReleaseLock?: () => void;
}

export function ProductForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  mode,
  lockToken,
  onReleaseLock,
}: ProductFormProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelfInputValue, setShelfInputValue] = useState("");
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    model: "",
    specTypeId: null,
    imageUrl: null,
    expiryDate: "",
    unitPrice: "",
    zoneId: "",
    shelfId: "",
    todayIn: "0",
    todayOut: "0",
    notes: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data) => setZones((data || []).filter((z: Zone) => !z.isVirtual)))
      .catch(console.error);
  }, []);

  // Fetch shelves when zone changes
  useEffect(() => {
    if (form.zoneId) {
      fetch(`/api/shelves?zoneId=${form.zoneId}`)
        .then((r) => r.json())
        .then((data) => setShelves(data || []))
        .catch(console.error);
    } else {
      setShelves([]);
    }
  }, [form.zoneId]);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        model: initialData.model || "",
        specTypeId: initialData.specTypeId ?? null,
        imageUrl: initialData.imageUrl || null,
        expiryDate: initialData.expiryDate || "",
        unitPrice: initialData.unitPrice?.toString() || "",
        zoneId: initialData.zoneId?.toString() || "",
        shelfId: initialData.shelfId?.toString() || "",
        todayIn: "0",
        todayOut: "0",
        notes: initialData.notes || "",
      });
      setShelfInputValue(initialData.shelfName || "");
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    } else {
      setForm({
        name: "",
        model: "",
        specTypeId: null,
        imageUrl: null,
        expiryDate: "",
        unitPrice: "",
        zoneId: "",
        shelfId: "",
        todayIn: "0",
        todayOut: "0",
        notes: "",
      });
      setShelfInputValue("");
      setImageFile(null);
      setImagePreview(null);
    }
  }, [initialData, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("请输入产品名称", "error");
      return;
    }
    if (!form.zoneId) {
      showToast("请选择存放区域", "error");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const zoneIdInt = form.zoneId ? parseInt(form.zoneId) : "";
      const todayIn = form.todayIn ? parseInt(form.todayIn) : 0;
      const todayOut = form.todayOut ? parseInt(form.todayOut) : 0;

      await onSave({
        ...form,
        imageUrl,
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : null,
        zoneId: zoneIdInt,
        shelfId: form.shelfId || null,
        shelfName: shelfInputValue.trim() || null,
        todayIn,
        todayOut,
        specTypeId: form.specTypeId || null,
      });

      showToast(
        mode === "add" ? "产品添加成功" : "产品修改成功",
        "success"
      );
      handleClose();
    } catch (e: any) {
      showToast(e.message || "操作失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (onReleaseLock) onReleaseLock();
    onOpenChange(false);
  };

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (onReleaseLock && open) onReleaseLock();
    };
  }, []);

  const updateField = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === "add" ? "新增产品" : "修改产品"}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          <div className="space-y-5">
            {/* Image upload */}
            <div>
              <Label>产品图片</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 aspect-square max-w-[200px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <Camera size={32} className="text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">拍照 / 上传图片</span>
                  </>
                )}
              </div>
            </div>

            {/* Product name */}
            <div>
              <Label>产品名称</Label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="请输入产品名称"
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Product category (model) */}
            <div>
              <Label>产品类别</Label>
              <CategoryInput
                value={form.model}
                onChange={(val) => updateField("model", val)}
                placeholder="如：美妆类、服装类、日化类..."
              />
            </div>

            {/* Expiry date */}
            <div>
              <Label>有效期</Label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField("expiryDate", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit price */}
            <div>
              <Label>成本价 (元)</Label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={(e) => updateField("unitPrice", e.target.value)}
                placeholder="请输入成本价"
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zone selector */}
            <div>
              <Label>存放区域</Label>
              <select
                value={form.zoneId}
                onChange={(e) => {
                  updateField("zoneId", e.target.value);
                  updateField("shelfId", "");
                }}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">请选择区域</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id.toString()}>
                    {zone.name}区
                  </option>
                ))}
              </select>
            </div>

            {/* Shelf selector */}
            <div>
              <Label>货架号</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shelfInputValue}
                  onChange={(e) => setShelfInputValue(e.target.value)}
                  placeholder="如 A001，可直接输入新货架号"
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!form.zoneId}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.zoneId ? '输入货架号，已有货架可快速选择' : '请先选择存放区域'}
              </p>
              {/* Quick-select existing shelves */}
              {form.zoneId && shelves.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {shelves.map((shelf) => (
                    <button
                      key={shelf.id}
                      type="button"
                      onClick={() => setShelfInputValue(shelf.name)}
                      className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      {shelf.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Today in/out */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>本次入库数量</Label>
                <input
                  type="number"
                  min="0"
                  value={form.todayIn}
                  onChange={(e) => updateField("todayIn", e.target.value)}
                  placeholder="本次入库增量"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label>本次出库数量</Label>
                <input
                  type="number"
                  min="0"
                  value={form.todayOut}
                  onChange={(e) => updateField("todayOut", e.target.value)}
                  placeholder="本次出库增量"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>备注</Label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="可选备注信息"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Stock info (edit mode only) */}
            {mode === "edit" && initialData?.currentStock != null && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">昨日库存</p>
                  <p className="text-sm font-medium text-gray-700">
                    {initialData.yesterdayStock ?? initialData.currentStock}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <p className="text-xs text-gray-500">当前库存</p>
                  <p className="text-lg font-bold text-blue-700">
                    {initialData.currentStock}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple category input with history quick-select
function CategoryInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [history, setHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch distinct categories from existing products
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((data) => setHistory(data || []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (val.trim()) {
      const filtered = history.filter((h) =>
        h.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredHistory(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (!value.trim() && history.length > 0) {
            setFilteredHistory(history);
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showDropdown && filteredHistory.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-40 overflow-auto">
          {filteredHistory.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onChange(cat);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 text-left"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
