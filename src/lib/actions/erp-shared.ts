// Tipos/Zod/cálculos del ERP (Cotizador/Ventas/Gastos). Sin "use server".
import { z } from "zod";

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  qty: z.number().min(0),
  unitCost: z.number().min(0),
  unitPrice: z.number().min(0),
});

export const createQuoteSchema = z.object({
  bucketId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  customerName: z.string().trim().max(200).optional(),
  clientId: z.string().uuid().optional().nullable(),
  ivaRate: z.number().min(0).max(1),
  notes: z.string().trim().optional(),
  items: z.array(quoteItemSchema).min(1),
});

export const updateQuoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  customerName: z.string().trim().max(200).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  ivaRate: z.number().min(0).max(1).optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  notes: z.string().trim().nullable().optional(),
  items: z.array(quoteItemSchema).min(1).optional(),
});

export const createSaleSchema = z.object({
  bucketId: z.string().uuid(),
  saleDate: z.string().min(1),
  description: z.string().trim().min(1).max(500),
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().trim().max(200).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  qty: z.number().min(0),
  unitCost: z.number().min(0),
  unitPrice: z.number().min(0),
});

export const createExpenseSchema = z.object({
  bucketId: z.string().uuid(),
  kind: z.enum(["investment", "fixed_monthly"]),
  concept: z.string().trim().min(1).max(200),
  amount: z.number().min(0),
  category: z.string().trim().max(80).optional(),
  priority: z.enum(["alta", "media", "baja"]).optional(),
});

export interface QuoteItem {
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}

export interface QuoteTotals {
  productionCost: number;
  netSales: number;
  grossProfit: number;
  grossMarginPct: number;
  ivaAmount: number;
  totalWithIva: number;
}

export function computeQuoteTotals(
  items: QuoteItem[],
  ivaRate: number
): QuoteTotals {
  const productionCost = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const netSales = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const grossProfit = netSales - productionCost;
  const grossMarginPct = netSales > 0 ? grossProfit / netSales : 0;
  const ivaAmount = netSales * ivaRate;
  const totalWithIva = netSales + ivaAmount;
  return {
    productionCost,
    netSales,
    grossProfit,
    grossMarginPct,
    ivaAmount,
    totalWithIva,
  };
}

export interface QuoteRow {
  id: string;
  bucketId: string;
  title: string;
  customerName: string | null;
  clientId: string | null;
  ivaRate: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  notes: string | null;
  items: QuoteItem[];
  createdAt: string;
}

export interface SaleRow {
  id: string;
  bucketId: string;
  saleDate: string;
  description: string;
  clientId: string | null;
  clientName: string | null;
  categoryId: string | null;
  qty: number;
  unitCost: number;
  unitPrice: number;
  total: number;
  profit: number;
}

export interface ExpenseRow {
  id: string;
  bucketId: string;
  kind: "investment" | "fixed_monthly";
  concept: string;
  amount: number;
  category: string | null;
  priority: string | null;
}
