// Tipos, esquemas Zod y helpers del módulo Operaciones.
// NO lleva "use server": un módulo de server actions solo puede exportar
// funciones async, así que los valores/tipos compartidos viven aquí.

import { z } from "zod";

// ─── Envelope ─────────────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}
export function fail<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

// ─── Dinero (numeric ↔ number) ────────────────────────────────────────────────

export function toMoney(s: string | null | undefined): number {
  const n = Number(s ?? 0);
  return Number.isFinite(n) ? n : 0;
}
export function fromMoney(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const currencySchema = z.enum(["CRC", "USD"]);
export const productStatusSchema = z.enum([
  "active",
  "archived",
  "out_of_stock",
]);

export const createProductCategorySchema = z.object({
  bucketId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido")
    .optional(),
  sortOrder: z.number().int().optional(),
});

export const updateProductCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido")
    .optional(),
  sortOrder: z.number().int().optional(),
});

export const createProductSchema = z.object({
  bucketId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  sku: z.string().trim().max(60).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  currency: currencySchema,
  basePrice: z.number().min(0),
  defaultMaterialsCost: z.number().min(0),
  defaultLaborCost: z.number().min(0),
  imageUrl: z.string().url().optional().nullable(),
});

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().nullable().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  status: productStatusSchema.optional(),
  currency: currencySchema.optional(),
  basePrice: z.number().min(0).optional(),
  defaultMaterialsCost: z.number().min(0).optional(),
  defaultLaborCost: z.number().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export const updateProductCostsSchema = z.object({
  id: z.string().uuid(),
  materialsCost: z.number().min(0),
  laborCost: z.number().min(0),
  note: z.string().trim().optional(),
});

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  bucketId: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  bucketId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  status: "active" | "archived" | "out_of_stock";
  currency: "CRC" | "USD";
  basePrice: number;
  defaultMaterialsCost: number;
  defaultLaborCost: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CostHistoryEntry {
  id: string;
  materialsCost: number;
  laborCost: number;
  note: string | null;
  changedAt: string;
}
