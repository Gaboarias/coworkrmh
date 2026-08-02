/**
 * Contraste WCAG 2.1 — matemática pura, sin dependencias.
 *
 * SC-005 exige contraste AA en texto y controles, en los dos temas. Hasta ahora
 * era una afirmación sin medir. Esto permite medirlo en un test en vez de a ojo.
 *
 * Fórmulas: WCAG 2.1, "relative luminance" y "contrast ratio".
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0–1. Los tokens de superficie suave (`--accent-soft`) son rgba. */
  a: number;
}

/** Umbrales AA. */
export const AA_NORMAL = 4.5;
/** Texto grande (≥18.66px bold o ≥24px) y componentes de interfaz. */
export const AA_LARGE = 3;

/**
 * Acepta `#rgb`, `#rrggbb`, `rgb(...)` y `rgba(...)`.
 * Devuelve null si no reconoce el formato, para que el caller decida — un
 * throw acá haría que un token nuevo rompa el test por la razón equivocada.
 */
export function parseColor(input: string): Rgb | null {
  const s = input.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: parts.length > 3 ? parts[3] : 1,
    };
  }

  return null;
}

/** Compone `fg` sobre `bg` respetando el alfa. `bg` se asume opaco. */
export function composite(fg: Rgb, bg: Rgb): Rgb {
  if (fg.a >= 1) return { ...fg, a: 1 };
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return {
    r: mix(fg.r, bg.r),
    g: mix(fg.g, bg.g),
    b: mix(fg.b, bg.b),
    a: 1,
  };
}

/** Luminancia relativa según WCAG 2.1. Ignora el alfa: componer primero. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Ratio de contraste entre 1 y 21.
 *
 * Ambos colores se componen sobre `surface` antes de medir: un texto
 * semitransparente sobre un fondo semitransparente no contrasta con lo que dice
 * su valor crudo, sino con lo que termina viendo el ojo.
 */
export function contrastRatio(fg: Rgb, bg: Rgb, surface: Rgb): number {
  const solidBg = composite(bg, surface);
  const solidFg = composite(fg, solidBg);
  const l1 = relativeLuminance(solidFg);
  const l2 = relativeLuminance(solidBg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** Redondeo a un decimal, que es como se reportan los ratios. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Clase de texto legible sobre un color que **elige el usuario**.
 *
 * Los colores de proyecto y de etiqueta salen de un swatch: el sistema no sabe
 * de antemano si van a ser un vino oscuro o un amarillo pálido. Fijar
 * `text-white` funciona para la mitad de la paleta y borra la etiqueta en la
 * otra mitad — y como el usuario eligió ese color a propósito, nadie lo reporta
 * como bug: se asume que "quedó feo".
 *
 * Los dos tokens de destino NO cambian con el tema, porque describen el fondo
 * sobre el que se posan, no el tema de la app.
 *
 * Devuelve una clase de Tailwind en vez de un hex para que el color siga
 * saliendo de los tokens y no haya literales sueltos en los componentes.
 */
export function readableTextOn(background: string | Rgb): string {
  const bg =
    typeof background === "string" ? parseColor(background) : background;

  // Un color que no se puede leer no se puede medir. La tinta oscura es la
  // apuesta segura: el swatch por defecto y los grises claros son mayoría.
  if (!bg) return "text-ink-on-light";

  const opaque = composite(bg, { r: 255, g: 255, b: 255, a: 1 });
  const onLight = contrastRatio(INK_ON_LIGHT, opaque, opaque);
  const onDark = contrastRatio(INK_ON_DARK, opaque, opaque);

  return onDark > onLight ? "text-ink-on-dark" : "text-ink-on-light";
}

/**
 * Espejo de `--ink-on-light` / `--ink-on-dark` en `globals.css`.
 *
 * Extremos puros a propósito: parte de la paleta de swatches cae en el valle de
 * luminancia media, donde una tinta teñida no llega a AA por ninguno de los dos
 * lados. `token-contrast.test.ts` mide la paleta entera y falla si dejan de
 * alcanzar, así que los dos archivos no pueden separarse en silencio.
 */
const INK_ON_LIGHT: Rgb = { r: 0, g: 0, b: 0, a: 1 };
const INK_ON_DARK: Rgb = { r: 255, g: 255, b: 255, a: 1 };
