"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  erpProducts,
  erpQuotes,
  erpQuoteItems,
  erpSales,
  erpExpenses,
  erpTeam,
  workspaces,
} from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";
import { toMoney, fromMoney, fromRate } from "@/lib/utils/money";

const requireWs = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error("Selecciona un entorno");
  const { permissions } = await getWorkspacePermissions(ws.id);
  const can = (key: string) => permissions.has(key);
  return { ws, userId: session.user.id, can };
};

/** Igual que requireWs pero exige una capacidad concreta del entorno. */
const requireWsCan = async (key: string) => {
  const ctx = await requireWs();
  if (!ctx.can(key)) {
    throw new Error("No tenés permiso para esta acción en este entorno");
  }
  return ctx;
};

const ER = "/operations";

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  materialsCost: number;
  laborCost: number;
  totalCost: number;
  price: number;
  profit: number;
  marginPct: number;
}

export const listProducts = async (): Promise<ProductRow[]> => {
  const { ws } = await requireWs();
  const rows = await db
    .select()
    .from(erpProducts)
    .where(eq(erpProducts.workspaceId, ws.id))
    .orderBy(asc(erpProducts.category), asc(erpProducts.name));
  return rows.map((r) => {
    const materialsCost = toMoney(r.materialsCost);
    const laborCost = toMoney(r.laborCost);
    const price = toMoney(r.price);
    const totalCost = materialsCost + laborCost;
    const profit = price - totalCost;
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      materialsCost,
      laborCost,
      totalCost,
      price,
      profit,
      marginPct: price > 0 ? profit / price : 0,
    };
  });
};

export const createProduct = async (input: {
  name: string;
  category?: string;
  materialsCost: number;
  laborCost: number;
  price: number;
}) => {
  const { ws } = await requireWsCan("catalog.manage");
  if (!input.name.trim()) throw new Error("El nombre es obligatorio");
  await db.insert(erpProducts).values({
    workspaceId: ws.id,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    materialsCost: fromMoney(input.materialsCost),
    laborCost: fromMoney(input.laborCost),
    price: fromMoney(input.price),
  });
  revalidatePath(`${ER}/catalogo`);
};

export const updateProduct = async (
  id: string,
  input: {
    name: string;
    category?: string;
    materialsCost: number;
    laborCost: number;
    price: number;
  }
) => {
  const { ws } = await requireWsCan("catalog.manage");
  await db
    .update(erpProducts)
    .set({
      name: input.name.trim(),
      category: input.category?.trim() || null,
      materialsCost: fromMoney(input.materialsCost),
      laborCost: fromMoney(input.laborCost),
      price: fromMoney(input.price),
      updatedAt: new Date(),
    })
    .where(and(eq(erpProducts.id, id), eq(erpProducts.workspaceId, ws.id)));
  revalidatePath(`${ER}/catalogo`);
};

export const deleteProduct = async (id: string) => {
  const { ws } = await requireWsCan("catalog.manage");
  await db
    .delete(erpProducts)
    .where(and(eq(erpProducts.id, id), eq(erpProducts.workspaceId, ws.id)));
  revalidatePath(`${ER}/catalogo`);
};

// ─── Cotizador ────────────────────────────────────────────────────────────────

export interface QuoteItemInput {
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}
export interface QuoteTotals {
  productionCost: number;
  netSales: number;
  grossProfit: number;
  marginPct: number;
  ivaAmount: number;
  totalWithIva: number;
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

export const listQuotes = async (): Promise<QuoteRow[]> => {
  const { ws } = await requireWs();
  const rows = await db
    .select()
    .from(erpQuotes)
    .where(eq(erpQuotes.workspaceId, ws.id))
    .orderBy(desc(erpQuotes.updatedAt));
  const out: QuoteRow[] = [];
  for (const q of rows) {
    out.push({
      id: q.id,
      title: q.title,
      customerName: q.customerName,
      ivaRate: toMoney(q.ivaRate),
      status: q.status,
      notes: q.notes,
      items: await loadQuoteItems(q.id),
      createdAt: q.createdAt.toISOString(),
    });
  }
  return out;
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

export const createQuote = async (input: {
  title: string;
  customerName?: string;
  ivaRate: number;
  notes?: string;
  items: QuoteItemInput[];
}): Promise<{ id: string }> => {
  const { ws, userId } = await requireWsCan("quotes.manage");
  if (!input.title.trim()) throw new Error("El título es obligatorio");
  const clean = input.items.filter((i) => i.description.trim());
  if (clean.length === 0) throw new Error("Agrega al menos un ítem");
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

// ─── Ventas ───────────────────────────────────────────────────────────────────

export interface SaleRow {
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
    .orderBy(desc(erpSales.saleDate));
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
    byCategory: [...cat.entries()].map(([category, v]) => ({
      category,
      ...v,
    })),
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
  const { ws, userId } = await requireWsCan("sales.manage");
  if (!input.saleDate || !input.description.trim())
    throw new Error("Fecha y descripción son obligatorias");
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

// ─── Gastos ───────────────────────────────────────────────────────────────────

export interface ExpenseRow {
  id: string;
  kind: "investment" | "fixed";
  concept: string;
  amount: number;
  category: string | null;
  priority: string | null;
}
export interface ExpensesResult {
  investment: ExpenseRow[];
  fixed: ExpenseRow[];
  totalInvestment: number;
  totalFixed: number;
  breakEvenMargin: number;
  breakEvenSales: number;
}

export const listExpenses = async (): Promise<ExpensesResult> => {
  const { ws } = await requireWs();
  const rows = await db
    .select()
    .from(erpExpenses)
    .where(eq(erpExpenses.workspaceId, ws.id))
    .orderBy(asc(erpExpenses.createdAt));
  const [wsRow] = await db
    .select({ m: workspaces.breakEvenMargin })
    .from(workspaces)
    .where(eq(workspaces.id, ws.id))
    .limit(1);
  const map = (r: (typeof rows)[number]): ExpenseRow => ({
    id: r.id,
    kind: r.kind,
    concept: r.concept,
    amount: toMoney(r.amount),
    category: r.category,
    priority: r.priority,
  });
  const investment = rows.filter((r) => r.kind === "investment").map(map);
  const fixed = rows.filter((r) => r.kind === "fixed").map(map);
  const totalInvestment = investment.reduce((s, r) => s + r.amount, 0);
  const totalFixed = fixed.reduce((s, r) => s + r.amount, 0);
  const breakEvenMargin = wsRow?.m ? toMoney(wsRow.m) : 0.45;
  return {
    investment,
    fixed,
    totalInvestment,
    totalFixed,
    breakEvenMargin,
    breakEvenSales: breakEvenMargin > 0 ? totalFixed / breakEvenMargin : 0,
  };
};

export const createExpense = async (input: {
  kind: "investment" | "fixed";
  concept: string;
  amount: number;
  category?: string;
  priority?: string;
}) => {
  const { ws, userId } = await requireWsCan("expenses.manage");
  if (!input.concept.trim()) throw new Error("El concepto es obligatorio");
  await db.insert(erpExpenses).values({
    workspaceId: ws.id,
    kind: input.kind,
    concept: input.concept.trim(),
    amount: fromMoney(input.amount),
    category: input.category?.trim() || null,
    priority: input.kind === "investment" ? input.priority ?? null : null,
    createdById: userId,
  });
  revalidatePath(`${ER}/gastos`);
};

export const deleteExpense = async (id: string) => {
  const { ws } = await requireWsCan("expenses.manage");
  await db
    .delete(erpExpenses)
    .where(and(eq(erpExpenses.id, id), eq(erpExpenses.workspaceId, ws.id)));
  revalidatePath(`${ER}/gastos`);
};

export const setBreakEvenMargin = async (margin: number) => {
  const { ws } = await requireWsCan("expenses.manage");
  const safe = Math.min(Math.max(margin, 0), 0.9999);
  await db
    .update(workspaces)
    .set({ breakEvenMargin: fromRate(safe), updatedAt: new Date() })
    .where(eq(workspaces.id, ws.id));
  revalidatePath(`${ER}/gastos`);
};

// ─── Equipo ───────────────────────────────────────────────────────────────────

export interface TeamMemberRow {
  id: string;
  name: string;
  role: string | null;
  responsibilities: string | null;
  compensation: string | null;
  status: string;
}

export const getTeam = async (): Promise<{
  members: TeamMemberRow[];
  agreements: string;
}> => {
  const { ws } = await requireWs();
  const members = await db
    .select()
    .from(erpTeam)
    .where(eq(erpTeam.workspaceId, ws.id))
    .orderBy(asc(erpTeam.sortOrder), asc(erpTeam.name));
  const [wsRow] = await db
    .select({ a: workspaces.teamAgreements })
    .from(workspaces)
    .where(eq(workspaces.id, ws.id))
    .limit(1);
  return {
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      responsibilities: m.responsibilities,
      compensation: m.compensation,
      status: m.status,
    })),
    agreements: wsRow?.a ?? "",
  };
};

export const createTeamMember = async (input: {
  name: string;
  role?: string;
  responsibilities?: string;
  compensation?: string;
  status?: string;
}) => {
  const { ws } = await requireWsCan("team.manage");
  if (!input.name.trim()) throw new Error("El nombre es obligatorio");
  await db.insert(erpTeam).values({
    workspaceId: ws.id,
    name: input.name.trim(),
    role: input.role?.trim() || null,
    responsibilities: input.responsibilities?.trim() || null,
    compensation: input.compensation?.trim() || null,
    status: input.status ?? "active",
  });
  revalidatePath(`${ER}/equipo`);
};

export const updateTeamMember = async (
  id: string,
  input: {
    name: string;
    role?: string;
    responsibilities?: string;
    compensation?: string;
    status?: string;
  }
) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .update(erpTeam)
    .set({
      name: input.name.trim(),
      role: input.role?.trim() || null,
      responsibilities: input.responsibilities?.trim() || null,
      compensation: input.compensation?.trim() || null,
      status: input.status ?? "active",
    })
    .where(and(eq(erpTeam.id, id), eq(erpTeam.workspaceId, ws.id)));
  revalidatePath(`${ER}/equipo`);
};

export const deleteTeamMember = async (id: string) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .delete(erpTeam)
    .where(and(eq(erpTeam.id, id), eq(erpTeam.workspaceId, ws.id)));
  revalidatePath(`${ER}/equipo`);
};

export const setAgreements = async (text: string) => {
  const { ws } = await requireWsCan("team.manage");
  await db
    .update(workspaces)
    .set({ teamAgreements: text, updatedAt: new Date() })
    .where(eq(workspaces.id, ws.id));
  revalidatePath(`${ER}/equipo`);
};
