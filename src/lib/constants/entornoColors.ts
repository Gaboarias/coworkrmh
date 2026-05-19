// Paleta acotada y accesible para el color identitario de un entorno.
// Reemplaza el color picker libre (contraste impredecible) por swatches.
export const ENTORNO_SWATCHES = [
  "#6B5FE4", // violeta
  "#2563B6", // azul
  "#0E7A4E", // verde
  "#B07A00", // ámbar
  "#C2410C", // naranja
  "#BE123C", // frambuesa
  "#7C3AED", // púrpura
  "#0F766E", // teal
] as const;

export const DEFAULT_ENTORNO_COLOR = ENTORNO_SWATCHES[0];
