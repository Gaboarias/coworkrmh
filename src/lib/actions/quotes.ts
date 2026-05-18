"use server";

import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes, quoteItems, changelog } from "@/lib/db/schema";
import { bucketCan } from "@/lib/access";
import {
  ok,
  fail,
  toMoney,
  fromMoney,
  type ActionResult,
} from "@/lib/actions/products-shared";
import {
  createQuoteSchema,
  updateQuoteSchema,
  type QuoteRow,
} from "@/lib/actions/erp-shared";
import type { z } from "zod";

async function uid() {
  const s = await auth();
  return s?.user?.id ?? null;
}

async function loadItems(quoteId: string) {
  const rows = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId))
    .orderBy(quoteItems.sortOrder);
  return rows.map((r) => ({
    description: r.description,
    qty: toMoney(r.qty),
    unitCost: toMoney(r.unitCost),
    unitPrice: toMoney(r.unitPrice),
  }));
}

export async function listQuotes(
  bucketId: string
): Promise<ActionResult<QuoteRow[]>> {
  if (!(await bucketCan(bucketId, "quotes.view")))
    return fail("Sin permiso");
  const rows = await db
    .select()
    .from(quotes)
    .where(eq(quotes.bucketId, bucketId))
    .orderBy(desc(quotes.updatedAt));
  const out: QuoteRow[] = [];
  for (const q of rows) {
    out.push({
      id: q.id,
      bucketId: q.bucketId,
      title: q.title,
      customerName: q.customerName,
      clientId: q.clientId,
      ivaRate: toMoney(q.ivaRate),
      status: q.status,
      notes: q.notes,
      items: await loadItems(q.id),
      createdAt: q.createdAt.toISOString(),
    });
  }
  return ok(out);
}

export async function getQuote(id: string): Promise<ActionResult<QuoteRow>> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!q) return fail("Cotización no encontrada");
  if (!(await bucketCan(q.bucketId, "quotes.view")))
    return fail("Sin permiso");
  return ok({
    id: q.id,
    bucketId: q.bucketId,
    title: q.title,
    customerName: q.customerName,
    clientId: q.clientId,
    ivaRate: toMoney(q.ivaRate),
    status: q.status,
    notes: q.notes,
    items: await loadItems(q.id),
    createdAt: q.createdAt.toISOString(),
  });
}

async function replaceItems(
  quoteId: string,
  items: { description: string; qty: number; unitCost: number; unitPrice: number }[]
) {
  await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  await db.insert(quoteItems).values(
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

export async function createQuote(
  input: z.infer<typeof createQuoteSchema>
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!(await bucketCan(parsed.data.bucketId, "quotes.manage")))
    return fail("Sin permiso");

  const [q] = await db
    .insert(quotes)
    .values({
      bucketId: parsed.data.bucketId,
      title: parsed.data.title,
      customerName: parsed.data.customerName ?? null,
      clientId: parsed.data.clientId ?? null,
      ivaRate: fromMoney(parsed.data.ivaRate),
      notes: parsed.data.notes ?? null,
      createdById: userId,
    })
    .returning();
  await replaceItems(q.id, parsed.data.items);
  await db.insert(changelog).values({
    userId,
    action: "created",
    entityType: "quote",
    entityId: q.id,
    description: `Creó la cotización "${q.title}"`,
  });
  revalidatePath(`/operations/${parsed.data.bucketId}/quotes`);
  return ok({ id: q.id });
}

export async function updateQuote(
  input: z.infer<typeof updateQuoteSchema>
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const parsed = updateQuoteSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const [q] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, parsed.data.id))
    .limit(1);
  if (!q) return fail("Cotización no encontrada");
  if (!(await bucketCan(q.bucketId, "quotes.manage")))
    return fail("Sin permiso");

  const d = parsed.data;
  await db
    .update(quotes)
    .set({
      title: d.title ?? q.title,
      customerName:
        d.customerName !== undefined ? d.customerName : q.customerName,
      clientId: d.clientId !== undefined ? d.clientId : q.clientId,
      ivaRate: d.ivaRate !== undefined ? fromMoney(d.ivaRate) : q.ivaRate,
      status: d.status ?? q.status,
      notes: d.notes !== undefined ? d.notes : q.notes,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, d.id));
  if (d.items) await replaceItems(d.id, d.items);
  await db.insert(changelog).values({
    userId,
    action: "updated",
    entityType: "quote",
    entityId: d.id,
    description: `Actualizó la cotización "${d.title ?? q.title}"`,
  });
  revalidatePath(`/operations/${q.bucketId}/quotes`);
  revalidatePath(`/operations/${q.bucketId}/quotes/${d.id}`);
  return ok({ id: d.id });
}

export async function deleteQuote(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail("No autenticado");
  const [q] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!q) return fail("Cotización no encontrada");
  if (!(await bucketCan(q.bucketId, "quotes.manage")))
    return fail("Sin permiso");
  await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath(`/operations/${q.bucketId}/quotes`);
  return ok({ id });
}
