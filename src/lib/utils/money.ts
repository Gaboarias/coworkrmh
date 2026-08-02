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

/**
 * Acota una tasa a [0, 1] (0% – 100%).
 *
 * Dos motivos: numeric(5,4) sólo admite hasta 9.9999, así que un 13 (o sea,
 * alguien escribiendo "13" pensando en 13%) reventaba con overflow al guardar;
 * y antes de eso la pantalla ya mostraba un total con 1300% de impuesto.
 * El IVA de Costa Rica es 13% → 0.13.
 */
export const clampRate = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
};

/** Acota un monto/cantidad a >= 0. Los negativos no tienen sentido acá. */
export const clampNonNegative = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(n, 0);
};

/**
 * Separador de miles.
 *
 * `toLocaleString("es-CR")` agrupa con un ESPACIO DURO (U+00A0): devuelve
 * `2 400 000,00`. Es lo que dice CLDR, pero no es como se escribe la plata en
 * Costa Rica, donde va punto: `2.400.000,00`. La diferencia sale impresa en las
 * cotizaciones que ve el cliente.
 *
 * Se normaliza en vez de pedir otro locale (`es-ES`, `de-DE` dan el formato
 * correcto de casualidad): usar el locale de otro país para acertarle al de
 * este es un acierto frágil, que se rompe el día que alguien toque el decimal.
 *
 * Cubre el espacio duro y el fino (U+202F), porque ICU ha usado los dos según
 * la versión. Si algún día CLDR cambia es-CR al punto, esto queda sin efecto en
 * vez de romperse.
 */
const GROUP_SEPARATORS = /[   ]/g;

// Formato de dinero unificado para todo el módulo Operaciones.
export function formatMoney(
  n: number,
  currency: "CRC" | "USD" | string = "CRC"
): string {
  const symbol = currency === "USD" ? "$" : "₡";
  const body = n
    .toLocaleString("es-CR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(GROUP_SEPARATORS, ".");
  return `${symbol}${body}`;
}
