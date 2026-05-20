// Paleta acotada y accesible para el color identitario de un entorno.
// Reemplaza el color picker libre (contraste impredecible) por swatches.
// Marca = café (mocha) + menta; los swatches NO usan verde-menta ni teal
// para no fundirse con el chrome (sidebar mocha, primary menta).
export const ENTORNO_SWATCHES = [
  "#2563B6", // azul royal
  "#475569", // grafito
  "#9A6B00", // ámbar
  "#C2410C", // naranja
  "#BE123C", // frambuesa
  "#7C3AED", // púrpura
  "#DB7C00", // mango
  "#A03A6B", // magenta
] as const;

export const DEFAULT_ENTORNO_COLOR = ENTORNO_SWATCHES[0];
