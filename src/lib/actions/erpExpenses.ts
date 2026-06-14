"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpExpenses, workspaces } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { toMoney, fromMoney, fromRate } from "@/lib/utils/money";
import { ER, requireWs, requireWsCan } from "./erp.helpers";

interface ExpenseRow {
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
  const [rows, [wsRow]] = await Promise.all([
    db
      .select()
      .from(erpExpenses)
      .where(eq(erpExpenses.workspaceId, ws.id))
      .orderBy(asc(erpExpenses.createdAt))
      .limit(500),
    db
      .select({ m: workspaces.breakEvenMargin })
      .from(workspaces)
      .where(eq(workspaces.id, ws.id))
      .limit(1),
  ]);
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
  if (!input.concept.trim()) throw new Error("El concepto es obligatorio");
  const { ws, userId } = await requireWsCan("expenses.manage");
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
