export interface User {
  id: number;
  username: string;
  role: "admin" | "editor";
  displayName: string;
  isActive: number;
}

export interface Zone {
  id: number;
  name: string;
  isFixed: number;
  isVirtual: number;
  sortOrder: number;
}

export interface SpecType {
  id: number;
  category: string;
  label: string;
}

export interface Product {
  id: number;
  name: string;
  model: string;
  specTypeId: number | null;
  imageUrl: string | null;
  expiryDate: string | null;
  unitPrice: number | null;
  zoneId: number;
  todayIn: number;
  todayOut: number;
  currentStock: number;
  notes: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  zoneName?: string;
  specTypeLabel?: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  userId: number;
  changeType: "in" | "out" | "adjustment";
  quantity: number;
  notes: string | null;
  createdAt: string;
  userDisplayName?: string;
}

export interface ProductEditLock {
  id: number;
  productId: number;
  lockedBy: number;
  lockedByName?: string;
  lockedAt: string;
  expiresAt: string;
}

export interface SearchResult extends Product {
  expiryStatus: "expired" | "near_expiry" | "ok";
}
