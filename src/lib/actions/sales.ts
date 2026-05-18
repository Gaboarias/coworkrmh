"use server";

import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sales, changelog, productCategories } from "@/lib/db/schema";
import { bucketCan } from "@/lib/access";
import {
  ok,
  fail,
  toMoney,
  fromMoney,
  type ActionResult,
} from "@/lib/actions/products-shared";
import { createSaleSchema, type SaleRow } from "@/lib/actions/erp-shared";
import type { z } from "zod";

async function uid() {
  const s = await auth();
  return s?.user?.id ?? null;
}

export interface SaleListResult {
  rows: (SaleRow & { categoryName: string | null })[];
  totals: { sales: number; profit: number };
  byCategory: { category: string; sales: number; profit: number }[];
}

export async function listSales(
  bucketId: string
): Promise<ActionResult<SaleListResult>> {
  if (!(await bucketCan(bucketId, "sales.view"))) return fail("Sin permiso");
  const rows = await db
    .select({
      id: sales.id,
      bucketId: sales.bucketId,
      saleDate: sales.saleDate,
      description: sales.description,
      clientId: sales.clientId,
      clientName: sales.clientName,
      categoryId: sales.categoryId,
      qty: sales.qty,
      unitCost: sales.unitCost,
      unitPrice: sales.unitPrice,
      categoryName: productCategories.name,
    })
    .from(sales)
    .leftJoin(productCategories, eq(sales.categoryId, productCategories.id))
    .where(eq(sales.bucketId, bucketId))
    .orderBy(desc(sales.saleDate));

  const mapped = rows.map((r) => {
    const qty = toMoney(r.qty);
    const unitCost = toMoney(r.unitCost);
    const unitPrice = toMoney(r.unitPrice);
    const total = qty * unitPrice;
    const profit = total - qty * unitCost;
    return {
      id: r.id,
      bucketId: r.bucketId,
      saleDate: r.saleDate as string,
      description: r.description,
      clientId: r.clientId,
      clientName: r.clientName,
      categoryId: r.categoryId,
      qty,
      unitCost,
      unitPrice,
      total,
      profit,
      categoryName: r.categoryName ?? null,
    };
  });

  const totals = mapped.reduce(
    (a, r) => ({ sales: a.sales + r.total, profit: a.profit + r.profit }),
    { sales: 0, profit: 0 }
  );
  const catMap = new Map<string, { sales: number; profit: number }>();
  for (const r of mapped) {
    const key = r.categoryName ?? "Sin categoría";
    const cur = catMap.get(key) ?? { sales: 0, profit: 0 };
    cur.sales += r.total;
    cur.profit += r.profit;
    catMap.set(key, cur);
  }
  const byCategory = [...catMap.entries()].map(([category, v]) => ({
    category,
    ...v,
  }));

  return ok({ rows: mapped, totals, byCategory });
}

export async function createSale(
  input: z.infer<typeof createSaleSchema>
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!(await bucketCan(parsed.data.bucketId, "sales.manage")))
    return fail("Sin permiso");

  const [row] = await db
    .insert(sales)
    .values({
      bucketId: parsed.data.bucketId,
      saleDate: parsed.data.saleDate,
      description: parsed.data.description,
      clientId: parsed.data.clientId ?? null,
      clientName: parsed.data.clientName ?? null,
      categoryId: parsed.data.categoryId ?? null,
      qty: fromMoney(parsed.data.qty),
      unitCost: fromMoney(parsed.data.unitCost),
      unitPrice: fromMoney(parsed.data.unitPrice),
      createdById: userId,
    })
    .returning();
  await db.insert(changelog).values({
    userId,
    action: "created",
    entityType: "sale",
    entityId: row.id,
    description: `Registró venta "${row.description}"`,
  });
  revalidatePath(`/operations/${parsed.data.bucketId}/sales`);
  return ok({ id: row.id });
}

export async function deleteSale(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const [s] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!s) return fail("Venta no encontrada");
  if (!(await bucketCan(s.bucketId, "sales.manage")))
    return fail("Sin permiso");
  await db.delete(sales).where(eq(sales.id, id));
  revalidatePath(`/operations/${s.bucketId}/sales`);
  return ok({ id });
}
