// Dinero unificado para Operaciones. numeric(12,2) viaja como string en DB.
export const toMoney = (s: string | null | undefined): number => {
  const n = Number(s ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const fromMoney = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toFixed(2);

// Tasas (IVA, margen) → columnas numeric(5,4): preservar 4 decimales.
export const fromRate = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toFixed(4);

// Formato de dinero unificado para todo el módulo Operaciones.
export function formatMoney(
  n: number,
  currency: "CRC" | "USD" | string = "CRC"
): string {
  const symbol = currency === "USD" ? "$" : "₡";
  return `${symbol}${n.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
