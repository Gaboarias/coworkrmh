"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpSales } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { toMoney, fromMoney } from "@/lib/utils/money";
import { ER, requireWs, requireWsCan } from "./erp.helpers";

interface SaleRow {
  id: string;
  saleDate: string;
  description: string;
  clientName: string | null;
  category: string | null;
  qty: number;
  unitCost: number;
  unitPrice: number;
  total: number;
  profit: number;
}

export interface SalesResult {
  rows: SaleRow[];
  totals: { sales: number; profit: number };
  byCategory: { category: string; sales: number; profit: number }[];
}

export const listSales = async (): Promise<SalesResult> => {
  const { ws } = await requireWs();
  const rows = await db
    .select()
    .from(erpSales)
    .where(eq(erpSales.workspaceId, ws.id))
    .orderBy(desc(erpSales.saleDate))
    .limit(500);
  const mapped: SaleRow[] = rows.map((r) => {
    const qty = toMoney(r.qty);
    const unitCost = toMoney(r.unitCost);
    const unitPrice = toMoney(r.unitPrice);
    const total = qty * unitPrice;
    return {
      id: r.id,
      saleDate: r.saleDate as string,
      description: r.description,
      clientName: r.clientName,
      category: r.category,
      qty,
      unitCost,
      unitPrice,
      total,
      profit: total - qty * unitCost,
    };
  });
  const totals = mapped.reduce(
    (a, r) => ({ sales: a.sales + r.total, profit: a.profit + r.profit }),
    { sales: 0, profit: 0 }
  );
  const cat = new Map<string, { sales: number; profit: number }>();
  for (const r of mapped) {
    const k = r.category?.trim() || "Sin categoría";
    const c = cat.get(k) ?? { sales: 0, profit: 0 };
    c.sales += r.total;
    c.profit += r.profit;
    cat.set(k, c);
  }
  return {
    rows: mapped,
    totals,
    byCategory: [...cat.entries()].map(([category, v]) => ({ category, ...v })),
  };
};

export const createSale = async (input: {
  saleDate: string;
  description: string;
  clientName?: string;
  category?: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}) => {
  if (!input.saleDate || !input.description.trim())
    throw new Error("Fecha y descripción son obligatorias");
  const { ws, userId } = await requireWsCan("sales.manage");
  await db.insert(erpSales).values({
    workspaceId: ws.id,
    saleDate: input.saleDate,
    description: input.description.trim(),
    clientName: input.clientName?.trim() || null,
    category: input.category?.trim() || null,
    qty: fromMoney(input.qty),
    unitCost: fromMoney(input.unitCost),
    unitPrice: fromMoney(input.unitPrice),
    createdById: userId,
  });
  revalidatePath(`${ER}/ventas`);
};

export const deleteSale = async (id: string) => {
  const { ws } = await requireWsCan("sales.manage");
  await db
    .delete(erpSales)
    .where(and(eq(erpSales.id, id), eq(erpSales.workspaceId, ws.id)));
  revalidatePath(`${ER}/ventas`);
};
