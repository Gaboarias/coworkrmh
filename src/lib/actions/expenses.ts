"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, buckets, changelog } from "@/lib/db/schema";
import { bucketCan } from "@/lib/access";
import {
  ok,
  fail,
  toMoney,
  fromMoney,
  type ActionResult,
} from "@/lib/actions/products-shared";
import { createExpenseSchema, type ExpenseRow } from "@/lib/actions/erp-shared";
import type { z } from "zod";

async function uid() {
  const s = await auth();
  return s?.user?.id ?? null;
}

export interface ExpenseSummary {
  investment: ExpenseRow[];
  fixedMonthly: ExpenseRow[];
  totalInvestment: number;
  totalFixedMonthly: number;
  breakEvenMargin: number;
  breakEvenSales: number;
}

export async function listExpenses(
  bucketId: string
): Promise<ActionResult<ExpenseSummary>> {
  if (!(await bucketCan(bucketId, "expenses.view")))
    return fail("Sin permiso");

  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.bucketId, bucketId));
  const [b] = await db
    .select({ m: buckets.breakEvenMargin })
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .limit(1);

  const map = (r: (typeof rows)[number]): ExpenseRow => ({
    id: r.id,
    bucketId: r.bucketId,
    kind: r.kind,
    concept: r.concept,
    amount: toMoney(r.amount),
    category: r.category,
    priority: r.priority,
  });

  const investment = rows.filter((r) => r.kind === "investment").map(map);
  const fixedMonthly = rows
    .filter((r) => r.kind === "fixed_monthly")
    .map(map);
  const totalInvestment = investment.reduce((s, r) => s + r.amount, 0);
  const totalFixedMonthly = fixedMonthly.reduce((s, r) => s + r.amount, 0);
  const breakEvenMargin = b?.m ? toMoney(b.m) : 0.45;
  const breakEvenSales =
    breakEvenMargin > 0 ? totalFixedMonthly / breakEvenMargin : 0;

  return ok({
    investment,
    fixedMonthly,
    totalInvestment,
    totalFixedMonthly,
    breakEvenMargin,
    breakEvenSales,
  });
}

export async function createExpense(
  input: z.infer<typeof createExpenseSchema>
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!(await bucketCan(parsed.data.bucketId, "expenses.manage")))
    return fail("Sin permiso");

  const [row] = await db
    .insert(expenses)
    .values({
      bucketId: parsed.data.bucketId,
      kind: parsed.data.kind,
      concept: parsed.data.concept,
      amount: fromMoney(parsed.data.amount),
      category: parsed.data.category ?? null,
      priority: parsed.data.priority ?? null,
      createdById: userId,
    })
    .returning();
  await db.insert(changelog).values({
    userId,
    action: "created",
    entityType: "expense",
    entityId: row.id,
    description: `Registró gasto "${row.concept}"`,
  });
  revalidatePath(`/operations/${parsed.data.bucketId}/expenses`);
  return ok({ id: row.id });
}

export async function deleteExpense(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const [e] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  if (!e) return fail("Gasto no encontrado");
  if (!(await bucketCan(e.bucketId, "expenses.manage")))
    return fail("Sin permiso");
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath(`/operations/${e.bucketId}/expenses`);
  return ok({ id });
}

export async function setBreakEvenMargin(
  bucketId: string,
  margin: number
): Promise<ActionResult<{ ok: true }>> {
  if (!(await bucketCan(bucketId, "expenses.manage")))
    return fail("Sin permiso");
  await db
    .update(buckets)
    .set({ breakEvenMargin: fromMoney(margin), updatedAt: new Date() })
    .where(eq(buckets.id, bucketId));
  revalidatePath(`/operations/${bucketId}/expenses`);
  return ok({ ok: true });
}
