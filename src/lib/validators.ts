import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export const createUserSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符"),
  password: z.string().min(4, "密码至少4个字符"),
  displayName: z.string().min(1, "请输入显示名称"),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const productSchema = z.object({
  name: z.string().min(1, "请输入产品名称"),
  model: z.string().optional().default(""),
  specTypeId: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  zoneId: z.number({ message: "请选择存放区域" }),
  todayIn: z.number().int().optional().default(0),
  todayOut: z.number().int().optional().default(0),
  notes: z.string().nullable().optional(),
});

export const zoneSchema = z.object({
  name: z.string().min(1, "请输入区域名称"),
  isFixed: z.boolean().optional().default(false),
});

export const specTypeSchema = z.object({
  category: z.string().min(1, "请输入规格类别"),
  label: z.string().min(1, "请输入规格值"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ZoneInput = z.infer<typeof zoneSchema>;
export type SpecTypeInput = z.infer<typeof specTypeSchema>;
