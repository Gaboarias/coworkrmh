// Paleta acotada y accesible para el color identitario de un entorno.
// Reemplaza el color picker libre (contraste impredecible) por swatches.
export const ENTORNO_SWATCHES = [
  "#2563B6", // azul
  "#0F766E", // teal
  "#9A6B00", // ámbar
  "#C2410C", // naranja
  "#BE123C", // frambuesa
  "#7C3AED", // púrpura
  "#0E7A8C", // cian
  "#A03A6B", // magenta
] as const;

export const DEFAULT_ENTORNO_COLOR = ENTORNO_SWATCHES[0];
