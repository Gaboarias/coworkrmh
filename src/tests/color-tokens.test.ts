import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Test de conformidad de tokens de color.
 *
 * Constitución v1.0.1, §Restricciones técnicas: los componentes de la app
 * interna NO DEBEN contener valores de color literales; todo color sale de
 * `globals.css` vía `tailwind.config.ts`.
 *
 * Por qué hace falta un test: un `#hex` suelto no rompe tipos, no rompe lint y
 * se ve bien en el tema en que lo escribiste. El caso real que lo motivó fueron
 * dos chips de estado con `bg-[oklch(0.22_0.06_145)]` — un fondo oscuro cableado
 * que en tema claro no se adaptaba, y que nadie notó durante meses.
 *
 * El escáner descuenta comentarios antes de buscar. Sin eso, documentar el valor
 * viejo al migrarlo ("era #ff6b6b") haría fallar el test, que es justo el
 * incentivo opuesto al que se busca.
 *
 * Excepciones: van con un comentario `color-literal-ok: <razón>` en las líneas
 * previas. La constitución reconoce dos casos — superficies que no deben heredar
 * el tema interno, y salidas fuera del árbol de React/Tailwind.
 */

/** El portal queda fuera por diseño: `(portal)/**` no debe heredar el tema. */
const ROOTS = ["src/components", "src/app/(app)"];

const ESCAPE = /color-literal-ok:\s*(.+)/;
const MIN_REASON = 20;

const LITERAL = /oklch\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g;

/**
 * Vocabulario de token retirado (T006 / T036).
 *
 * Eran alias puros de un token Edition 04 — dos nombres para el mismo color. Se
 * migraron los 396 usos y se sacaron de `tailwind.config.ts`, así que hoy **no
 * producen ningún estilo**: una clase `text-text-muted` que reaparezca no rompe
 * el build ni el tipado, simplemente deja el texto sin color. Falla en silencio,
 * que es exactamente el caso que justifica un test.
 */
const RETIRED: { pattern: RegExp; use: string }[] = [
  { pattern: /\btext-text-tertiary\b/g, use: "text-ink-faint" },
  { pattern: /\btext-text-muted\b/g, use: "text-ink-soft" },
  { pattern: /\btext-text\b(?!-)/g, use: "text-ink" },
  { pattern: /\btext-foreground\b/g, use: "text-ink" },
  { pattern: /\bbg-background\b/g, use: "bg-bg" },
  { pattern: /\bborder-border-strong\b/g, use: "border-rule-strong" },
  { pattern: /\bborder-border\b(?!-)/g, use: "border-rule" },
  { pattern: /\bdivide-border\b/g, use: "divide-rule" },
  { pattern: /\bring-border\b/g, use: "ring-rule" },
  { pattern: /\b(?:text|bg|border)-danger\b/g, use: "…-urgent" },
  { pattern: /\b(?:text|bg|border)-success\b/g, use: "…-done" },
  { pattern: /\b(?:text|bg|border)-warning\b/g, use: "…-warn" },
];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/**
 * Quita comentarios de bloque y de línea, conservando el número de líneas para
 * que los reportes sigan apuntando al lugar correcto.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    // `//` solo cuando no es parte de `https://`
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1);
}

/** Cuántas líneas hacia arriba se busca el marcador antes de rendirse. */
const MAX_LOOKBACK = 12;

/**
 * Busca el marcador de excepción arriba de `line`, parando en la primera línea
 * en blanco.
 *
 * No alcanza con exigir que las líneas intermedias sean comentario: el marcador
 * documenta la sentencia, y el literal suele estar unas líneas adentro de ella
 * (`html2canvas(el, {` … `backgroundColor: "#fff"`). La línea en blanco es el
 * separador natural entre bloques, así que sirve de límite sin cortar el vínculo
 * entre un comentario y el código que describe.
 */
function escapeReasonAbove(lines: string[], line: number): string | null {
  const stop = Math.max(0, line - 1 - MAX_LOOKBACK);
  for (let i = line - 2; i >= stop; i--) {
    const text = lines[i].trim();
    const m = ESCAPE.exec(text);
    if (m) return m[1].trim();
    if (text === "") return null;
  }
  return null;
}

type Hit = { file: string; line: number; literal: string };

function scan() {
  const hits: Hit[] = [];
  const escapes: { file: string; line: number; reason: string }[] = [];
  let filesScanned = 0;

  for (const root of ROOTS) {
    for (const file of tsxFiles(root)) {
      filesScanned++;
      const rel = relative(".", file).replace(/\\/g, "/");
      const raw = readFileSync(file, "utf8");
      const rawLines = raw.split(/\r?\n/);
      const code = stripComments(raw);

      LITERAL.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = LITERAL.exec(code))) {
        const line = code.slice(0, m.index).split("\n").length;

        const reason = escapeReasonAbove(rawLines, line);

        if (reason) escapes.push({ file: rel, line, reason });
        else hits.push({ file: rel, line, literal: m[0] });
      }
    }
  }
  return { hits, escapes, filesScanned };
}

describe("tokens de color", () => {
  const { hits, escapes, filesScanned } = scan();

  it("ningún componente interno cablea un color literal", () => {
    const report = hits.map((h) => `  ${h.file}:${h.line}  ${h.literal}`).join("\n");
    expect(report, `Colores literales fuera de los tokens:\n${report}`).toBe("");
  });

  it("cada excepción explica por qué", () => {
    for (const e of escapes) {
      expect(
        e.reason.length,
        `${e.file}:${e.line} — razón demasiado corta: "${e.reason}"`
      ).toBeGreaterThan(MIN_REASON);
    }
  });

  it("nadie usa el vocabulario de token retirado", () => {
    const found: string[] = [];
    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const rel = relative(".", file).replace(/\\/g, "/");
        const code = stripComments(readFileSync(file, "utf8"));
        for (const { pattern, use } of RETIRED) {
          pattern.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = pattern.exec(code))) {
            const line = code.slice(0, m.index).split("\n").length;
            found.push(`  ${rel}:${line}  ${m[0]} → ${use}`);
          }
        }
      }
    }
    expect(
      found.join("\n"),
      `Clases retiradas que ya no producen estilo:\n${found.join("\n")}`
    ).toBe("");
  });

  it("el escáner mira código de verdad y descuenta comentarios", () => {
    expect(filesScanned, "no se escaneó ningún archivo").toBeGreaterThan(50);
    // Guard contra un stripComments que se coma el código entero y deje el
    // test verde para siempre.
    const sample = stripComments('const a = "#ff0000"; // era #00ff00');
    expect(sample).toContain("#ff0000");
    expect(sample).not.toContain("#00ff00");
  });
});
