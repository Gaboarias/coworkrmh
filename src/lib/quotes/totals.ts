/**
 * Aritmética de una cotización — módulo puro.
 *
 * Sin `db`, sin `async`, sin "use server": tiene que poder llamarse desde el
 * servidor Y desde el cliente. Esa es justamente la razón de existir.
 *
 * Antes esta cuenta vivía en TRES implementaciones:
 *   1. erpQuotes.computeQuoteTotals — `async` sin un solo await, dentro de un
 *      archivo "use server". Eso la convertía en server action, así que el
 *      formulario no podía llamarla... y de hecho nadie la llamaba: era código
 *      muerto.
 *   2. QuoteForm — useMemo con la cuenta repetida, para el preview en vivo.
 *   3. cotizador/page — `net + net * ivaRate` a mano en la lista.
 * Tres copias de la misma cuenta de plata pueden divergir en silencio, y acá
 * divergir significa mandarle al cliente un número que no es.
 *
 * El IVA se guarda y se calcula como FRACCIÓN (0.13 = 13%). La UI lo edita en
 * porcentaje; la conversión vive en el formulario, no acá.
 */

import { clampRate, clampNonNegative } from "@/lib/utils/money";

export interface QuoteItemInput {
  description: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
}

export interface QuoteTotals {
  /** Σ qty × costo unitario. */
  productionCost: number;
  /** Σ qty × precio unitario, sin IVA. */
  netSales: number;
  /** netSales − productionCost. */
  grossProfit: number;
  /** grossProfit / netSales, en fracción (0.6 = 60%). 0 si no hay venta. */
  marginPct: number;
  /** netSales × ivaRate. */
  ivaAmount: number;
  /** netSales + ivaAmount. */
  totalWithIva: number;
}

/**
 * Totales de una cotización.
 *
 * Sanea la entrada por las suyas (cantidades y montos a >= 0, tasa a [0,1]):
 * los `min`/`max` del input son sólo del navegador, y esta función también se
 * llama con datos que ya venían de la DB.
 */
export function computeQuoteTotals(
  items: readonly QuoteItemInput[],
  ivaRate: number
): QuoteTotals {
  const rate = clampRate(ivaRate);

  let productionCost = 0;
  let netSales = 0;
  for (const it of items) {
    const qty = clampNonNegative(it.qty);
    productionCost += qty * clampNonNegative(it.unitCost);
    netSales += qty * clampNonNegative(it.unitPrice);
  }

  const grossProfit = netSales - productionCost;
  const ivaAmount = netSales * rate;

  return {
    productionCost,
    netSales,
    grossProfit,
    marginPct: netSales > 0 ? grossProfit / netSales : 0,
    ivaAmount,
    totalWithIva: netSales + ivaAmount,
  };
}

/** Total con IVA de una cotización ya guardada (atajo para listados). */
export function quoteTotalWithIva(
  items: readonly QuoteItemInput[],
  ivaRate: number
): number {
  return computeQuoteTotals(items, ivaRate).totalWithIva;
}
