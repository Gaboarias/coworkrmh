import { describe, it, expect } from "vitest";
import { clampRate, clampNonNegative, fromRate, fromMoney, toMoney } from "./money";

describe("clampRate — tasa de IVA", () => {
  /**
   * El IVA de Costa Rica es 13% → 0.13. El campo pedía la fracción, así que
   * escribir "13" (lo que uno diría en voz alta) daba 1300% de impuesto en
   * pantalla y, al guardar, overflow de numeric(5,4) (máx 9.9999).
   */
  it("acota el error clásico de escribir 13 en vez de 0.13", () => {
    expect(clampRate(13)).toBe(1);
    expect(clampRate(100)).toBe(1);
    expect(clampRate(9999)).toBe(1);
  });

  it("deja pasar las tasas válidas", () => {
    expect(clampRate(0.13)).toBe(0.13);
    expect(clampRate(0)).toBe(0);
    expect(clampRate(1)).toBe(1);
    expect(clampRate(0.04)).toBe(0.04);
  });

  // Un valor no finito es basura, no "la tasa más alta posible": cae a 0.
  // Para un impuesto, el default seguro es no cobrar nada, no cobrar 100%.
  it("no admite negativos, y la basura cae a 0 (no a 1)", () => {
    expect(clampRate(-0.13)).toBe(0);
    expect(clampRate(NaN)).toBe(0);
    expect(clampRate(Infinity)).toBe(0);
    expect(clampRate(-Infinity)).toBe(0);
  });

  // numeric(5,4) admite hasta 9.9999: lo que salga de clampRate tiene que entrar.
  it("el resultado siempre cabe en numeric(5,4)", () => {
    for (const v of [13, 100, 1e9, -5, NaN, Infinity, 0.13]) {
      const stored = Number(fromRate(clampRate(v)));
      expect(stored).toBeGreaterThanOrEqual(0);
      expect(stored).toBeLessThanOrEqual(9.9999);
    }
  });
});

describe("clampNonNegative — cantidades y montos", () => {
  it("corta los negativos (min=0 del input es sólo del navegador)", () => {
    expect(clampNonNegative(-5)).toBe(0);
    expect(clampNonNegative(-0.01)).toBe(0);
  });

  it("respeta los válidos", () => {
    expect(clampNonNegative(0)).toBe(0);
    expect(clampNonNegative(3)).toBe(3);
    expect(clampNonNegative(0.5)).toBe(0.5);
  });

  it("neutraliza NaN", () => {
    expect(clampNonNegative(NaN)).toBe(0);
  });
});

describe("conversiones de dinero", () => {
  it("toMoney tolera null/undefined/basura", () => {
    expect(toMoney(null)).toBe(0);
    expect(toMoney(undefined)).toBe(0);
    expect(toMoney("no-es-numero")).toBe(0);
    expect(toMoney("1234.56")).toBe(1234.56);
  });

  it("fromMoney fija 2 decimales", () => {
    expect(fromMoney(1234.567)).toBe("1234.57");
    expect(fromMoney(NaN)).toBe("0.00");
  });
});
