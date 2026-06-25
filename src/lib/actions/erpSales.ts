"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { erpSales } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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

// 500 filas para la TABLA (display). Los totales y el desglose por categoría
// se calculan en SQL sobre TODAS las ventas — así son correctos sin importar
// cuántas haya (antes se sumaban en JS sobre el corte de 500 → totales mal).
const SALES_DISPLAY_LIMIT = 500;
const CAT_KEY = sql<string>`coalesce(nullif(trim(${erpSales.category}), ''), 'Sin categoría')`;
const SUM_SALES = sql<string>`coalesce(sum(${erpSales.qty}::numeric * ${erpSales.unitPrice}::numeric), 0)`;
const SUM_PROFIT = sql<string>`coalesce(sum(${erpSales.qty}::numeric * (${erpSales.unitPrice}::numeric - ${erpSales.unitCost}::numeric)), 0)`;

export const listSales = async (): Promise<SalesResult> => {
  const { ws } = await requireWs();
  const where = eq(erpSales.workspaceId, ws.id);

  const [rows, [agg], catRows] = await Promise.all([
    db
      .select()
      .from(erpSales)
      .where(where)
      .orderBy(desc(erpSales.saleDate))
      .limit(SALES_DISPLAY_LIMIT),
    db
      .select({ sales: SUM_SALES, profit: SUM_PROFIT })
      .from(erpSales)
      .where(where),
    db
      .select({ category: CAT_KEY, sales: SUM_SALES, profit: SUM_PROFIT })
      .from(erpSales)
      .where(where)
      .groupBy(CAT_KEY)
      .orderBy(desc(SUM_SALES)),
  ]);

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

  return {
    rows: mapped,
    totals: { sales: Number(agg?.sales ?? 0), profit: Number(agg?.profit ?? 0) },
    byCategory: catRows.map((r) => ({
      category: r.category,
      sales: Number(r.sales),
      profit: Number(r.profit),
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
