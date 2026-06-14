"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpQuotes, erpQuoteItems } from "@/lib/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { toMoney, fromMoney, fromRate } from "@/lib/utils/money";
import { ER, requireWs, requireWsCan } from "./erp.helpers";

export interface QuoteItemInput {
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}

interface QuoteTotals {
  productionCost: number;
  netSales: number;
  grossProfit: number;
  marginPct: number;
  ivaAmount: number;
  totalWithIva: number;
}

export interface QuoteRow {
  id: string;
  title: string;
  customerName: string | null;
  ivaRate: number;
  status: string;
  notes: string | null;
  items: QuoteItemInput[];
  createdAt: string;
}

export const computeQuoteTotals = async (
  items: QuoteItemInput[],
  ivaRate: number
): Promise<QuoteTotals> => {
  const productionCost = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const netSales = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const grossProfit = netSales - productionCost;
  const ivaAmount = netSales * ivaRate;
  return {
    productionCost,
    netSales,
    grossProfit,
    marginPct: netSales > 0 ? grossProfit / netSales : 0,
    ivaAmount,
    totalWithIva: netSales + ivaAmount,
  };
};

const loadQuoteItems = async (quoteId: string): Promise<QuoteItemInput[]> => {
  const rows = await db
    .select()
    .from(erpQuoteItems)
    .where(eq(erpQuoteItems.quoteId, quoteId))
    .orderBy(asc(erpQuoteItems.sortOrder));
  return rows.map((r) => ({
    description: r.description,
    qty: toMoney(r.qty),
    unitCost: toMoney(r.unitCost),
    unitPrice: toMoney(r.unitPrice),
  }));
};

const replaceItems = async (quoteId: string, items: QuoteItemInput[]) => {
  await db.delete(erpQuoteItems).where(eq(erpQuoteItems.quoteId, quoteId));
  if (items.length > 0) {
    await db.insert(erpQuoteItems).values(
      items.map((it, i) => ({
        quoteId,
        description: it.description,
        qty: fromMoney(it.qty),
        unitCost: fromMoney(it.unitCost),
        unitPrice: fromMoney(it.unitPrice),
        sortOrder: i,
      }))
    );
  }
};

export const listQuotes = async (): Promise<QuoteRow[]> => {
  const { ws } = await requireWs();
  const rows = await db
    .select()
    .from(erpQuotes)
    .where(eq(erpQuotes.workspaceId, ws.id))
    .orderBy(desc(erpQuotes.updatedAt))
    .limit(500);
  if (rows.length === 0) return [];
  const quoteIds = rows.map((q) => q.id);
  const allItems = await db
    .select()
    .from(erpQuoteItems)
    .where(inArray(erpQuoteItems.quoteId, quoteIds))
    .orderBy(asc(erpQuoteItems.sortOrder));
  const byQuote = new Map<string, QuoteItemInput[]>();
  for (const r of allItems) {
    const arr = byQuote.get(r.quoteId) ?? [];
    arr.push({
      description: r.description,
      qty: toMoney(r.qty),
      unitCost: toMoney(r.unitCost),
      unitPrice: toMoney(r.unitPrice),
    });
    byQuote.set(r.quoteId, arr);
  }
  return rows.map((q) => ({
    id: q.id,
    title: q.title,
    customerName: q.customerName,
    ivaRate: toMoney(q.ivaRate),
    status: q.status,
    notes: q.notes,
    items: byQuote.get(q.id) ?? [],
    createdAt: q.createdAt.toISOString(),
  }));
};

export const getQuote = async (id: string): Promise<QuoteRow> => {
  const { ws } = await requireWs();
  const [q] = await db
    .select()
    .from(erpQuotes)
    .where(and(eq(erpQuotes.id, id), eq(erpQuotes.workspaceId, ws.id)))
    .limit(1);
  if (!q) throw new Error("Cotización no encontrada");
  return {
    id: q.id,
    title: q.title,
    customerName: q.customerName,
    ivaRate: toMoney(q.ivaRate),
    status: q.status,
    notes: q.notes,
    items: await loadQuoteItems(q.id),
    createdAt: q.createdAt.toISOString(),
  };
};

export const createQuote = async (input: {
  title: string;
  customerName?: string;
  ivaRate: number;
  notes?: string;
  items: QuoteItemInput[];
}): Promise<{ id: string }> => {
  if (!input.title.trim()) throw new Error("El título es obligatorio");
  const clean = input.items.filter((i) => i.description.trim());
  if (clean.length === 0) throw new Error("Agrega al menos un ítem");
  const { ws, userId } = await requireWsCan("quotes.manage");
  const [q] = await db
    .insert(erpQuotes)
    .values({
      workspaceId: ws.id,
      title: input.title.trim(),
      customerName: input.customerName?.trim() || null,
      ivaRate: fromRate(input.ivaRate),
      notes: input.notes?.trim() || null,
      createdById: userId,
    })
    .returning();
  await replaceItems(q.id, clean);
  revalidatePath(`${ER}/cotizador`);
  return { id: q.id };
};

export const updateQuote = async (
  id: string,
  input: {
    title: string;
    customerName?: string;
    ivaRate: number;
    status?: string;
    notes?: string;
    items: QuoteItemInput[];
  }
): Promise<{ id: string }> => {
  const { ws } = await requireWsCan("quotes.manage");
  const [q] = await db
    .select()
    .from(erpQuotes)
    .where(and(eq(erpQuotes.id, id), eq(erpQuotes.workspaceId, ws.id)))
    .limit(1);
  if (!q) throw new Error("Cotización no encontrada");
  const clean = input.items.filter((i) => i.description.trim());
  if (clean.length === 0) throw new Error("Agrega al menos un ítem");
  await db
    .update(erpQuotes)
    .set({
      title: input.title.trim(),
      customerName: input.customerName?.trim() || null,
      ivaRate: fromRate(input.ivaRate),
      status: input.status ?? q.status,
      notes: input.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(erpQuotes.id, id));
  await replaceItems(id, clean);
  revalidatePath(`${ER}/cotizador`);
  return { id };
};

export const deleteQuote = async (id: string) => {
  const { ws } = await requireWsCan("quotes.manage");
  await db
    .delete(erpQuotes)
    .where(and(eq(erpQuotes.id, id), eq(erpQuotes.workspaceId, ws.id)));
  revalidatePath(`${ER}/cotizador`);
};
