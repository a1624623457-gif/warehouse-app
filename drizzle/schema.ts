import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("viewer"),
  displayName: text("display_name").notNull(),
  isActive: integer("is_active").notNull().default(1),
  lastLoginIp: text("last_login_ip"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const zones = sqliteTable("zones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  isFixed: integer("is_fixed").notNull().default(0),
  isVirtual: integer("is_virtual").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const specTypes = sqliteTable("spec_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  model: text("model").notNull().default(""),
  specTypeId: integer("spec_type_id").references(() => specTypes.id),
  imageUrl: text("image_url"),
  expiryDate: text("expiry_date"),
  unitPrice: real("unit_price"),
  zoneId: integer("zone_id").references(() => zones.id),
  todayIn: integer("today_in").notNull().default(0),
  todayOut: integer("today_out").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const productEditLocks = sqliteTable("product_edit_locks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().unique().references(() => products.id),
  lockedBy: integer("locked_by").notNull().references(() => users.id),
  lockedAt: text("locked_at").default(sql`(datetime('now'))`),
  expiresAt: text("expires_at").notNull(),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  userId: integer("user_id").notNull().references(() => users.id),
  changeType: text("change_type", { enum: ["in", "out", "adjustment"] }).notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
