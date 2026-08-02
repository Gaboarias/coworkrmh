import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Test de conformidad de botones y CTA.
 *
 * Por qué existe: antes de este test había 110 cadenas de clase distintas
 * repartidas entre `<button>`, `<Link>` y `<a>`, con cinco maneras de escribir
 * "CTA sólido" y diez de escribir "botón de icono cuadrado". Ninguna de esas
 * divergencias rompe el compilador ni ningún otro test — se acumulan en
 * silencio hasta que el botón de guardar se ve distinto en dos pantallas.
 *
 * Este test no revisa cómo se ven los primitivos. Revisa que nadie los vuelva a
 * escribir a mano.
 *
 * Para saltarse la regla en un caso legítimo se pone un comentario
 * `conformidad-botones: <razón>` en las líneas justo encima del tag. La razón
 * va al lado del código, no en una lista lejana, y el test exige que diga algo:
 * una ruta sin explicación no alcanza.
 */

const ROOTS = ["src/app", "src/components"];

/** Marcador de excepción inline; debe ir en las 4 líneas previas al tag. */
const ESCAPE = /conformidad-botones:\s*(.+)/;
const ESCAPE_LOOKBACK = 4;
/** Una razón por debajo de esto es una excusa, no un motivo. */
const MIN_REASON = 25;

/**
 * Archivos que *definen* una receta. Son el único lugar donde puede vivir.
 * Cualquier otro archivo que escriba lo mismo está creando una variante sin
 * nombre.
 */
const RECIPE_OWNERS = new Set([
  "src/components/ui/Button.tsx",
  "src/components/ui/IconButton.tsx",
  "src/components/ui/SegmentedNav.tsx",
  "src/components/ui/Table.tsx",
  // El swatch es un cuadrado cuyo fondo ES el dato (style inline), no un token.
  "src/components/ui/SwatchPicker.tsx",
]);

/**
 * Elementos que solo pueden aparecer dentro de un primitivo.
 *
 * `<table>` está acá y no en RULES porque el problema no son sus clases sino el
 * elemento: una tabla escrita a mano no hereda `--erp-row-py`, así que ignora
 * en silencio la preferencia de densidad del usuario. Ese fue el estado real
 * hasta el 2026-08-01 — tres de seis vistas ERP la respetaban.
 */
const RESERVED_TAGS: { tag: string; use: string }[] = [
  { tag: "table", use: "<Table> de @/components/ui/Table" },
  { tag: "thead", use: "<TableHead> de @/components/ui/Table" },
];

const RULES: { name: string; matches: (c: string) => boolean; use: string }[] = [
  {
    name: "cta-solido",
    matches: (c) => /\bbg-primary\b/.test(c),
    use: "<Button> o buttonVariants()",
  },
  {
    name: "boton-de-icono",
    matches: (c) => /\bh-[789] w-[789]\b/.test(c) && /\brounded/.test(c),
    use: "<IconButton> o iconButtonVariants()",
  },
];

type Hit = { file: string; line: number; tag: string; classes: string; rule: string };

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/**
 * Índice del `>` que cierra la etiqueta abierta en `start`.
 *
 * No alcanza con buscar el primer `>`: los atributos JSX traen arrow functions
 * (`onClick={() => …}`) y comparaciones dentro de llaves, así que hay que
 * balancear llaves y saltear strings.
 */
function endOfOpeningTag(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i++;
        i++;
      }
    } else if (c === ">" && depth === 0) return i;
  }
  return -1;
}

/** Razón declarada en las líneas previas al tag, si la hay. */
function escapeReason(lines: string[], tagLine: number): string | null {
  const from = Math.max(0, tagLine - 1 - ESCAPE_LOOKBACK);
  for (const line of lines.slice(from, tagLine - 1)) {
    const m = ESCAPE.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

function scan() {
  const hits: Hit[] = [];
  const escapes: { file: string; line: number; reason: string }[] = [];
  let tagsSeen = 0;

  for (const root of ROOTS) {
    for (const file of tsxFiles(root)) {
      const rel = relative(".", file).replace(/\\/g, "/");
      if (RECIPE_OWNERS.has(rel)) continue;

      const src = readFileSync(file, "utf8");
      const lines = src.split(/\r?\n/);
      const tags = /<(button|Link|a)\b/g;
      let m: RegExpExecArray | null;

      while ((m = tags.exec(src))) {
        const end = endOfOpeningTag(src, m.index + m[0].length);
        if (end < 0) continue;
        tagsSeen++;

        const attrs = src.slice(m.index, end);
        // Todos los literales del tag: cubre className="…",
        // className={cn("…", cond && "…")} y className={`…`}.
        const classes = [...attrs.matchAll(/["'`]([^"'`]*)["'`]/g)]
          .map((x) => x[1])
          .join(" ")
          .replace(/\s+/g, " ");
        if (!classes) continue;

        const broken = RULES.filter((r) => r.matches(classes));
        if (broken.length === 0) continue;

        const line = src.slice(0, m.index).split("\n").length;
        const reason = escapeReason(lines, line);
        if (reason !== null) {
          escapes.push({ file: rel, line, reason });
          continue;
        }

        for (const rule of broken) {
          hits.push({
            file: rel,
            line,
            tag: m[1],
            classes: classes.slice(0, 110),
            rule: `${rule.name} → usar ${rule.use}`,
          });
        }
      }

      // Elementos reservados: acá no importan las clases, importa el elemento.
      for (const { tag, use } of RESERVED_TAGS) {
        const re = new RegExp(`<${tag}\\b`, "g");
        let t: RegExpExecArray | null;
        while ((t = re.exec(src))) {
          const line = src.slice(0, t.index).split("\n").length;
          if (escapeReason(lines, line) !== null) continue;
          hits.push({
            file: rel,
            line,
            tag,
            classes: "",
            rule: `elemento-reservado → usar ${use}`,
          });
        }
      }
    }
  }
  return { hits, escapes, tagsSeen };
}

describe("conformidad de botones", () => {
  const { hits, escapes, tagsSeen } = scan();

  it("ningún archivo escribe a mano una receta que ya vive en un primitivo", () => {
    const report = hits
      .map((h) => `  ${h.file}:${h.line} <${h.tag}> — ${h.rule}\n      ${h.classes}`)
      .join("\n");
    expect(report, `Recetas de botón escritas a mano:\n${report}`).toBe("");
  });

  it("cada excepción explica por qué, no solo que sí", () => {
    for (const e of escapes) {
      expect(
        e.reason.length,
        `${e.file}:${e.line} — la razón es demasiado corta para servirle a nadie: "${e.reason}"`
      ).toBeGreaterThan(MIN_REASON);
    }
  });

  it("el escáner encuentra código de verdad", () => {
    // Sin esto, un bug en endOfOpeningTag o en el regex dejaría los dos tests
    // de arriba en verde para siempre, sin haber mirado un solo archivo.
    expect(ROOTS.flatMap(tsxFiles).length).toBeGreaterThan(100);
    expect(tagsSeen).toBeGreaterThan(100);
    expect(escapes.length).toBeGreaterThan(0);
  });
});
