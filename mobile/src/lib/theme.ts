/**
 * Edition 04 design tokens — mirror del web/src/app/globals.css.
 *
 * Las clases Tailwind cubren la mayoría de casos. Este archivo expone
 * los mismos tokens como constantes JS para los pocos casos donde se
 * necesitan dinámicamente (status bar style, gradientes manuales,
 * SVG fills, project color injection, etc).
 *
 * Si cambia un token acá, actualizar también tailwind.config.js
 * para mantener la consistencia entre className y JS.
 */

export const COLORS = {
  light: {
    bg: "#f5f2eb",
    bg2: "#ebe7dc",
    surface: "#ffffff",
    surface2: "#f1ede3",
    surfaceEl: "#ffffff",
    ink: "#161412",
    inkSoft: "#524d44",
    inkFaint: "#8a8378",
    rule: "rgba(22, 20, 18, 0.09)",
    ruleStrong: "rgba(22, 20, 18, 0.22)",
    accent: "#161412",
    accentSoft: "rgba(22, 20, 18, 0.06)",
    urgent: "#e8281c",
    done: "#1f7a4d",
    info: "#2e52d9",
    warn: "#e89a0d",
  },
  dark: {
    bg: "#0a0a09",
    bg2: "#131311",
    surface: "#141412",
    surface2: "#1a1a18",
    surfaceEl: "#1f1f1c",
    ink: "#f0ede5",
    inkSoft: "#a39d92",
    inkFaint: "#6a655c",
    rule: "rgba(240, 237, 229, 0.08)",
    ruleStrong: "rgba(240, 237, 229, 0.2)",
    accent: "#f0ede5",
    accentSoft: "rgba(240, 237, 229, 0.08)",
    urgent: "#ff4a3a",
    done: "#2e9e63",
    info: "#5577ee",
    warn: "#f5af2e",
  },
} as const;

/**
 * Paleta canónica Edition 04 — usada como project.color en la DB.
 * Coincide con web/src/lib/constants/entornoColors.ts.
 */
export const PROJECT_PALETTE = [
  "#d63a1f", // vermillion
  "#1f7a4d", // emerald
  "#e89a0d", // saffron
  "#2e52d9", // cobalt
  "#7a3aa0", // grape
  "#3a8a8a", // teal
  "#b94a8a", // berry
  "#5a6020", // moss
] as const;

export const FONTS = {
  // Family name como aparece en el TTF interno (ver app.json plugin expo-font).
  satoshi: "Satoshi",
  satoshiItalic: "Satoshi-Italic",
  // JetBrains Mono se carga via @expo-google-fonts/jetbrains-mono, donde
  // los nombres siguen el patrón "JetBrainsMono_500Medium".
  monoMedium: "JetBrainsMono_500Medium",
} as const;

/**
 * Escala tipográfica Edition 04 — coincide con la web.
 * Usar como className via tailwind cuando posible, y como número
 * absoluto via JS cuando un componente necesita programar fontSize.
 */
export const TYPE = {
  display: { size: 56, lineHeight: 56 * 0.95, letterSpacing: -2.2 }, // -0.04em on 56
  displayLg: { size: 72, lineHeight: 72 * 0.95, letterSpacing: -2.9 },
  h2: { size: 24, lineHeight: 28, letterSpacing: -0.6 },
  body: { size: 16, lineHeight: 24 }, // 17px web → 16px mobile (smaller screen)
  bodySoft: { size: 15, lineHeight: 22 },
  caption: { size: 13, lineHeight: 18 },
  mono: { size: 12, lineHeight: 14, letterSpacing: 1.9 }, // 0.16em
  monoSm: { size: 11, lineHeight: 13, letterSpacing: 1.7 },
} as const;

/**
 * Espaciado base — usar Tailwind classes (p-4, gap-3) cuando posible,
 * estos números son para casos dinámicos.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type ColorScheme = keyof typeof COLORS;
export type ColorToken = keyof typeof COLORS.light;
