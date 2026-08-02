import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseColor,
  contrastRatio,
  readableTextOn,
  round1,
  AA_NORMAL,
  AA_LARGE,
  type Rgb,
} from "@/lib/utils/contrast";
import { ENTORNO_SWATCHES } from "@/lib/constants/entornoColors";

/**
 * Contraste de los tokens — SC-005.
 *
 * "Contraste WCAG AA en texto y controles en ambos temas" era, hasta este test,
 * una afirmación sin una sola medición detrás. Acá se mide cada par
 * texto/fondo que la interfaz usa de verdad, en claro y en oscuro.
 *
 * Los pares salen de dónde se usan los tokens en el código, no de todas las
 * combinaciones posibles: medir pares que nadie escribe daría un número peor y
 * ninguna información.
 */

const CSS = readFileSync("src/app/globals.css", "utf8");

/** Cuerpo de un bloque CSS, balanceando llaves. */
function blockBody(selector: string): string {
  const start = CSS.indexOf(selector);
  if (start < 0) throw new Error(`no se encontró el selector ${selector}`);
  const open = CSS.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}") {
      depth--;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`bloque sin cerrar en ${selector}`);
}

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[name] = value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  }
  return out;
}

/** Sigue las cadenas `var(--x)` hasta un valor literal. */
function resolve(map: Record<string, string>, name: string): string | null {
  const seen = new Set<string>();
  let value: string | undefined = map[name];
  while (value && !seen.has(value)) {
    seen.add(value);
    const ref = /^var\(--([\w-]+)\)$/.exec(value);
    if (!ref) return value;
    value = map[ref[1]];
  }
  return value ?? null;
}

const LIGHT = declarations(blockBody(":root"));
// El bloque `.dark` solo redefine algunos tokens; el resto se hereda de :root.
const DARK = { ...LIGHT, ...declarations(blockBody(".dark")) };

function color(map: Record<string, string>, token: string): Rgb {
  const raw = resolve(map, token);
  if (!raw) throw new Error(`token --${token} no definido`);
  const parsed = parseColor(raw);
  if (!parsed) throw new Error(`no se pudo parsear --${token}: "${raw}"`);
  return parsed;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };

/** Toda superficie opaca sobre la que se dibuja texto. */
const SURFACES = ["bg", "bg-2", "surface", "surface-2", "surface-el"] as const;

interface Pair {
  /** Dónde se usa, para que un fallo diga qué mirar. */
  where: string;
  fg: string | Rgb;
  bg: string;
  /** Superficie sobre la que se compone `bg` si es semitransparente. */
  on?: string;
  min?: number;
}

/**
 * Pares reales de la interfaz. `on` importa: los tokens `*-soft` son rgba, así
 * que su contraste depende de la superficie debajo.
 */
const PAIRS: Pair[] = [
  // Texto sobre TODAS las superficies, no solo las dos obvias.
  // Ajustar `ink-faint` contra `bg` y darlo por bueno dejaba pasar `bg-2` en
  // claro (4.1:1) y `surface-el` en oscuro (4.2:1): el peor caso no es el
  // fondo de página en ningún tema.
  ...SURFACES.flatMap((surface) =>
    (["ink", "ink-soft", "ink-faint"] as const).map((text) => ({
      where: `${text} sobre ${surface}`,
      fg: text,
      bg: surface,
    }))
  ),

  // Botones sólidos
  { where: "Button primary", fg: "primary-foreground", bg: "primary" },
  { where: "Button danger", fg: "on-solid", bg: "urgent" },
  { where: "Button done", fg: "on-solid", bg: "done" },

  // Badges: token de texto semántico sobre su tinte, compuesto sobre la tarjeta
  { where: "Badge success", fg: "done-text", bg: "done-soft", on: "surface" },
  { where: "Badge warning", fg: "warn-text", bg: "warn-soft", on: "surface" },
  { where: "Badge danger", fg: "urgent-text", bg: "urgent-soft", on: "surface" },
  { where: "Badge info", fg: "info-text", bg: "info-soft", on: "surface" },
  { where: "Badge neutral", fg: "ink-soft", bg: "accent-soft", on: "surface" },

  // Navegación segmentada
  { where: "SegmentedNav pill activo", fg: "ink", bg: "accent-soft", on: "bg" },
  { where: "SegmentedNav chip activo", fg: "bg", bg: "ink" },

  // Pills de globals.css
  { where: ".pill-urgent", fg: "on-solid", bg: "urgent" },
  { where: ".pill-done", fg: "on-solid", bg: "done" },
  { where: ".pill-info", fg: "on-solid", bg: "info" },
  { where: ".pill-warn", fg: "on-solid", bg: "warn" },

  // El anillo de foco tiene que distinguirse del fondo: es un componente de
  // interfaz, no texto, así que el umbral es 3:1 (WCAG 1.4.11).
  { where: "anillo de foco sobre página", fg: "project-color", bg: "bg", min: AA_LARGE },
];

/**
 * `--rule-strong` queda deliberadamente fuera de PAIRS.
 *
 * Mide 1.6:1 en claro y 1.7:1 en oscuro. Como separador decorativo eso está
 * bien —WCAG 1.4.11 exime a los divisores—, pero `Button` lo usa además como
 * borde de las variantes `secondary` y `outline`, donde sí delimita un control
 * y debería llegar a 3:1.
 *
 * Subirlo a 3:1 convertiría todas las hairlines del sistema en líneas gruesas y
 * cambiaría la estética sobre la que está construido todo el rediseño. Es una
 * decisión de diseño, no un bug que se arregle solo, así que se deja anotada en
 * vez de resuelta por default.
 */
export const PENDING_RULE_STRONG =
  "rule-strong como borde de control: 1.6:1 (claro) / 1.7:1 (oscuro), WCAG 1.4.11 pide 3:1";

function measure(theme: Record<string, string>, p: Pair) {
  const surface = color(theme, p.on ?? "bg");
  const fg = typeof p.fg === "string" ? color(theme, p.fg) : p.fg;
  const bg = color(theme, p.bg);
  return round1(contrastRatio(fg, bg, surface));
}

describe("contraste de tokens (SC-005)", () => {
  for (const [themeName, theme] of [
    ["claro", LIGHT],
    ["oscuro", DARK],
  ] as const) {
    it(`tema ${themeName}: todos los pares llegan a AA`, () => {
      const failures: string[] = [];
      for (const p of PAIRS) {
        const min = p.min ?? AA_NORMAL;
        const ratio = measure(theme, p);
        if (ratio < min) {
          failures.push(
            `  ${p.where.padEnd(34)} ${String(ratio).padStart(5)}:1  (mínimo ${min}:1)`
          );
        }
      }
      expect(
        failures.join("\n"),
        `Pares por debajo de AA en tema ${themeName}:\n${failures.join("\n")}`
      ).toBe("");
    });
  }

  it("el parser resuelve los alias var(--x)", () => {
    // Guard: si `resolve` devolviera null en silencio, `color()` tiraría y el
    // test fallaría por la razón equivocada; si devolviera el string crudo,
    // parseColor daría null. Se comprueba un alias conocido.
    expect(resolve(LIGHT, "danger")).toBe(resolve(LIGHT, "urgent"));
    expect(resolve(LIGHT, "text-muted")).toBe(resolve(LIGHT, "ink-soft"));
  });

  it("mide una cantidad de pares que vale la pena", () => {
    expect(PAIRS.length).toBeGreaterThan(15);
  });
});

/**
 * Tinta sobre un color que elige el usuario.
 *
 * Estos pares no salen de un token: salen de un swatch. `readableTextOn()` mide
 * el fondo y devuelve una de dos tintas, así que lo que hay que comprobar no es
 * un valor sino que la ELECCIÓN sea correcta para toda la paleta ofrecida —
 * incluido el caso patológico de un color muy claro, donde la respuesta obvia
 * (blanco) es la equivocada.
 */
describe("tinta sobre color elegido por el usuario", () => {
  const INKS: Record<string, Rgb> = {
    "text-ink-on-light": color(LIGHT, "ink-on-light"),
    "text-ink-on-dark": color(LIGHT, "ink-on-dark"),
  };

  const CANDIDATES: string[] = [
    // `#e89a0d` (saffron) es el caso patológico dentro de la propia paleta
    // ofrecida: un dorado brillante donde el blanco da 2.3:1.
    ...ENTORNO_SWATCHES,
    // Fuera de la paleta ofrecida: las etiquetas de tarea aceptan cualquier
    // color, y los claros son justo donde `text-white` fallaba en silencio.
    "#ffe066", "#f8f9fa", "#a7f3d0", "#fcd5ce",
  ];

  it("la tinta elegida llega a AA sobre cada color de la paleta", () => {
    const failures: string[] = [];
    for (const swatch of CANDIDATES) {
      const cls = readableTextOn(swatch);
      const bg = parseColor(swatch)!;
      const ratio = round1(contrastRatio(INKS[cls], bg, bg));
      if (ratio < AA_NORMAL) {
        failures.push(`  ${swatch}  →  ${cls}  ${ratio}:1`);
      }
    }
    expect(
      failures.join("\n"),
      `Colores donde la tinta calculada no llega a AA:\n${failures.join("\n")}`
    ).toBe("");
  });

  it("elige distinta tinta según el fondo", () => {
    // Guard: una función que devolviera siempre lo mismo pasaría el test de
    // arriba para la paleta actual —toda oscura— sin decidir nada.
    expect(readableTextOn("#0e1728")).toBe("text-ink-on-dark");
    expect(readableTextOn("#ffe066")).toBe("text-ink-on-light");
  });

  it("un color ilegible cae en la tinta oscura y no revienta", () => {
    expect(readableTextOn("no-es-un-color")).toBe("text-ink-on-light");
  });
});
