"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";

interface SpecType {
  id: number;
  category: string;
  label: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string, specTypeId: number | null) => void;
  className?: string;
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const [specTypes, setSpecTypes] = useState<SpecType[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/spec-types")
      .then((r) => r.json())
      .then((data) => setSpecTypes(data))
      .catch(console.error);
  }, []);

  const categories = [...new Set(specTypes.map((s) => s.category))];
  const filteredLabels = selectedCategory
    ? specTypes.filter((s) => s.category === selectedCategory)
    : [];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleLabelSelect = (spec: SpecType) => {
    onChange(spec.label, spec.id);
    setOpen(false);
    setSelectedCategory(null);
  };

  const handleCustomInput = (input: string) => {
    onChange(input, null);
    setOpen(false);
    setSelectedCategory(null);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <div
        className="flex h-10 items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span className={cn("flex-1 truncate", !value && "text-gray-400")}>
          {value || "请选择或输入型号"}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("", null);
            }}
            className="text-gray-400 hover:text-gray-600 mr-1"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown
          size={16}
          className={cn(
            "text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {!selectedCategory ? (
            /* Level 1: Category selection */
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                选择规格类别
              </div>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategorySelect(cat);
                  }}
                  className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>{cat}</span>
                  <ChevronDown size={14} className="text-gray-400 -rotate-90" />
                </button>
              ))}
              {/* Custom input */}
              <div className="border-t px-3 py-2">
                <input
                  type="text"
                  placeholder="直接输入自定义型号..."
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomInput((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            /* Level 2: Value selection */
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(null);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← 返回
                </button>
                <span>{selectedCategory}</span>
              </div>
              {filteredLabels.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLabelSelect(spec);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between",
                    value === spec.label && "bg-blue-50 text-blue-700"
                  )}
                >
                  <span>{spec.label}</span>
                  {value === spec.label && <Check size={16} />}
                </button>
              ))}
              {/* Custom input */}
              <div className="border-t px-3 py-2">
                <input
                  type="text"
                  placeholder="直接输入自定义型号..."
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomInput((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
