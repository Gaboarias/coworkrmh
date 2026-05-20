// Devuelve un color de texto/ícono legible sobre un fondo hex arbitrario
// (los colores de entorno los elige el usuario). Luminancia relativa WCAG.
export const readableFg = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const int = parseInt(m[1], 16);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin((int >> 16) & 255);
  const g = toLin((int >> 8) & 255);
  const b = toLin(int & 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contraste vs blanco vs negro: umbral ~0.36 favorece texto oscuro temprano.
  return lum > 0.36 ? "#0e0f1f" : "#ffffff";
};
