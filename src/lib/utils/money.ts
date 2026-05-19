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
