"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpProducts } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { toMoney, fromMoney } from "@/lib/utils/money";
import { ER, requireWs, requireWsCan } from "./erp.helpers";

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
    .orderBy(asc(erpProducts.category), asc(erpProducts.name))
    .limit(500);
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
  if (!input.name.trim()) throw new Error("El nombre es obligatorio");
  const { ws } = await requireWsCan("catalog.manage");
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
