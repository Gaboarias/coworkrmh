// Paleta de colores Edition 04 — saturated, refinados, todos legibles
// como dots + barras + accents. Diseñada para que ningún par compita por
// el ojo (cada uno tiene su nicho cromático: warm reds, greens, ambers,
// blues, purples).
//
// Los 4 primeros son los "core" mostrados en specimens (vermillion /
// emerald / saffron / cobalt). Los 4 siguientes amplían el espectro para
// que estudios con muchos proyectos tengan variedad.
export const ENTORNO_SWATCHES = [
  "#d63a1f", // vermillion (warm red)
  "#1f7a4d", // emerald (deep green)
  "#e89a0d", // saffron (saturated gold)
  "#2e52d9", // cobalt (true blue)
  "#7a3aa0", // grape (purple)
  "#3a8a8a", // teal (cool blue-green)
  "#b94a8a", // berry (rose magenta)
  "#5a6020", // moss (olive yellow)
] as const;

export const DEFAULT_ENTORNO_COLOR = ENTORNO_SWATCHES[0];
