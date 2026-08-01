import { describe, it, expect } from "vitest";
import { computeQuoteTotals, quoteTotalWithIva } from "./totals";

const item = (qty: number, unitCost: number, unitPrice: number) => ({
  description: "ítem",
  qty,
  unitCost,
  unitPrice,
});

describe("computeQuoteTotals", () => {
  /**
   * Caso de referencia, verificado a mano contra la app en producción antes
   * de unificar las tres implementaciones.
   */
  it("3 × costo 100 / precio 250 al 13%", () => {
    const t = computeQuoteTotals([item(3, 100, 250)], 0.13);
    expect(t.productionCost).toBe(300);
    expect(t.netSales).toBe(750);
    expect(t.grossProfit).toBe(450);
    expect(t.marginPct).toBeCloseTo(0.6, 10);
    expect(t.ivaAmount).toBeCloseTo(97.5, 10);
    expect(t.totalWithIva).toBeCloseTo(847.5, 10);
  });

  it("suma varios ítems", () => {
    const t = computeQuoteTotals(
      [item(2, 50, 100), item(1, 100, 300)],
      0.13
    );
    expect(t.productionCost).toBe(200); // 2×50 + 1×100
    expect(t.netSales).toBe(500); // 2×100 + 1×300
    expect(t.grossProfit).toBe(300);
    expect(t.ivaAmount).toBeCloseTo(65, 10);
    expect(t.totalWithIva).toBeCloseTo(565, 10);
  });

  it("sin ítems da todo en cero y margen 0 (no NaN)", () => {
    const t = computeQuoteTotals([], 0.13);
    expect(t).toEqual({
      productionCost: 0,
      netSales: 0,
      grossProfit: 0,
      marginPct: 0,
      ivaAmount: 0,
      totalWithIva: 0,
    });
  });

  it("venta 0 no divide por cero al sacar el margen", () => {
    const t = computeQuoteTotals([item(1, 100, 0)], 0.13);
    expect(t.marginPct).toBe(0);
    expect(Number.isNaN(t.marginPct)).toBe(false);
  });

  // El módulo sanea por las suyas: los min/max del input son sólo del
  // navegador y esto también se llama con datos que ya venían de la DB.
  it("acota cantidades y montos negativos a 0", () => {
    const t = computeQuoteTotals([item(-5, 100, 250)], 0.13);
    expect(t.netSales).toBe(0);
    expect(t.productionCost).toBe(0);
    expect(t.totalWithIva).toBe(0);
  });

  it("acota la tasa: 13 (en vez de 0.13) no genera 1300% de impuesto", () => {
    const t = computeQuoteTotals([item(1, 0, 1000)], 13);
    expect(t.ivaAmount).toBe(1000); // clamp a 100%, no 13 000
    expect(t.totalWithIva).toBe(2000);
  });

  it("precio por debajo del costo da ganancia negativa (caso legítimo)", () => {
    const t = computeQuoteTotals([item(1, 500, 100)], 0.13);
    expect(t.netSales).toBe(100);
    expect(t.grossProfit).toBe(-400);
    expect(t.marginPct).toBeCloseTo(-4, 10);
  });

  it("es pura: no muta los ítems que recibe", () => {
    const items = [item(-5, 100, 250)];
    const snapshot = JSON.parse(JSON.stringify(items));
    computeQuoteTotals(items, 0.13);
    expect(items).toEqual(snapshot);
  });
});

describe("quoteTotalWithIva", () => {
  it("coincide con el total del cálculo completo", () => {
    const items = [item(3, 100, 250)];
    expect(quoteTotalWithIva(items, 0.13)).toBe(
      computeQuoteTotals(items, 0.13).totalWithIva
    );
  });
});
