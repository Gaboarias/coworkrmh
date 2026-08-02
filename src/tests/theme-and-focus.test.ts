import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Foco visible, coherencia de tema y aislamiento del portal.
 *
 * Cubre la parte automatizable de tres criterios que hasta ahora sólo se podían
 * comprobar a ojo, pantalla por pantalla (SC-003, SC-005 foco, SC-007). No
 * reemplaza mirar la app: reemplaza tener que volver a mirarla cada vez que
 * alguien toca un archivo.
 */

const ROOTS = ["src/components", "src/app"];
const PORTAL = "src/app/(portal)";

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
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const rel = (f: string) => relative(".", f).replace(/\\/g, "/");

/** Razón inline para saltarse la regla de foco. */
const FOCUS_OK = /foco-ok:\s*(.+)/;
const LOOKBACK = 6;

function reasonAbove(lines: string[], line: number): string | null {
  const stop = Math.max(0, line - 1 - LOOKBACK);
  for (let i = line - 2; i >= stop; i--) {
    const m = FOCUS_OK.exec(lines[i]);
    if (m) return m[1].trim();
    if (lines[i].trim() === "") return null;
  }
  return null;
}

describe("foco visible", () => {
  /**
   * `globals.css` define un `:focus-visible` global, pero las utilidades de
   * Tailwind se emiten después, así que un `focus:outline-none` lo pisa. Quitar
   * el outline sin poner otra cosa deja el control sin ningún indicador — y no
   * rompe nada, así que nadie se entera.
   */
  it("nadie quita el outline sin poner un anillo en su lugar", () => {
    const offenders: string[] = [];
    const escapes: { at: string; reason: string }[] = [];

    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const src = readFileSync(file, "utf8");
        const lines = src.split(/\r?\n/);
        lines.forEach((text, i) => {
          if (!/\boutline-none\b/.test(text)) return;
          const line = i + 1;
          // El reemplazo puede venir en la misma línea o en las dos siguientes,
          // cuando la cadena de clases está partida por cn().
          const window = lines.slice(i, i + 3).join(" ");
          if (/focus-visible:ring|focus:ring|focus-visible:outline-/.test(window)) return;

          const reason = reasonAbove(lines, line);
          if (reason) escapes.push({ at: `${rel(file)}:${line}`, reason });
          else offenders.push(`  ${rel(file)}:${line}`);
        });
      }
    }

    expect(
      offenders.join("\n"),
      `Controles sin indicador de foco:\n${offenders.join("\n")}`
    ).toBe("");
    // Guard: si el escáner dejara de encontrar los casos exentos, este test se
    // volvería vacío sin que nadie lo note.
    expect(escapes.length, "no se encontró ninguna excepción declarada").toBeGreaterThan(0);
    for (const e of escapes) {
      expect(e.reason.length, `${e.at}: razón demasiado corta`).toBeGreaterThan(25);
    }
  });
});

describe("coherencia de tema (SC-003)", () => {
  /**
   * El sistema es token-first: los dos temas salen de las CSS vars, no de
   * variantes `dark:` en el markup. Una sola `dark:` significa que esa pantalla
   * decide su tema aparte del resto, que es justo lo que SC-003 prohíbe.
   */
  it("ningún componente usa variantes dark: de Tailwind", () => {
    const found: string[] = [];
    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const src = readFileSync(file, "utf8");
        src.split(/\r?\n/).forEach((text, i) => {
          const m = /\bdark:[a-z-]+/.exec(text);
          if (m) found.push(`  ${rel(file)}:${i + 1}  ${m[0]}`);
        });
      }
    }
    expect(
      found.join("\n"),
      `El tema debe salir de los tokens, no de \`dark:\`:\n${found.join("\n")}`
    ).toBe("");
  });
});

describe("tema por defecto", () => {
  /**
   * El default vive en dos lugares y tiene que decir lo mismo:
   *
   *   1. `ThemeProvider` → `defaultTheme`, que aplica next-themes al hidratar.
   *   2. El script inline de `layout.tsx`, que corre ANTES de la hidratación
   *      justamente para que no haya flash.
   *
   * Si se separan, cada carga pinta un tema y la hidratación lo cambia por el
   * otro. No rompe nada: sólo parpadea, en toda la app, sin que quede claro de
   * dónde sale. Es el tipo de desajuste que sobrevive años.
   */
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const provider = readFileSync(
    "src/components/providers/ThemeProvider.tsx",
    "utf8"
  );

  it("el script inline y ThemeProvider declaran el mismo default", () => {
    const inScript = /getItem\('pistachio-theme'\)\s*\|\|\s*'(\w+)'/.exec(layout);
    const inProvider = /defaultTheme="(\w+)"/.exec(provider);

    expect(inScript, "no se encontró el default en el script inline").not.toBeNull();
    expect(inProvider, "no se encontró defaultTheme en ThemeProvider").not.toBeNull();
    expect(
      inScript![1],
      `el script inline dice "${inScript![1]}" y ThemeProvider "${inProvider![1]}": ` +
        "la app va a parpadear en cada carga"
    ).toBe(inProvider![1]);
  });

  it("la clave de storage es la misma en los dos", () => {
    // Con claves distintas, el script lee una preferencia que next-themes nunca
    // escribió: el usuario elige claro y en la carga siguiente vuelve a oscuro.
    expect(layout).toContain("'pistachio-theme'");
    expect(provider).toContain('storageKey="pistachio-theme"');
  });

  it("Consola arranca en oscuro", () => {
    // La dirección es dark-first: el marino es la decisión y el claro su
    // traducción. Con el default en claro, quien entra nuevo no la ve nunca.
    expect(provider).toMatch(/defaultTheme="dark"/);
  });
});

describe("voz tipográfica (Consola)", () => {
  /**
   * `globals.css` fija la mono en `body` dentro de `@layer base`, pero las
   * utilidades de Tailwind se emiten después: un `font-sans` en el className del
   * `<body>` gana y deja toda la app en la cara de lectura.
   *
   * Es el peor tipo de fallo: no rompe el build, no rompe un test, y la app se
   * ve perfectamente bien — sólo que en la tipografía equivocada. Estuvo así
   * hasta que se miró el className a mano.
   */
  it("el body no pisa la mono con una utilidad de familia", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    // La etiqueta entera: el className es un template literal con
    // `${fuente.variable}` adentro, así que cortar en la primera llave se come
    // justo la parte que interesa.
    const body = /<body[\s\S]*?>/.exec(layout);
    expect(body, "no se encontró la etiqueta <body>").not.toBeNull();
    const tag = body![0];
    expect(
      tag,
      `el <body> lleva font-sans y anula la voz de Consola: ${tag}`
    ).not.toMatch(/\bfont-sans\b/);
    expect(tag, "el <body> debe fijar font-mono explícitamente").toMatch(
      /\bfont-mono\b/
    );
  });

  it("la variable de la mono está conectada a la fuente cargada", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    // Sin `variable: "--font-mono"` la var no existe y `font-mono` cae al
    // monospace genérico del sistema: se ve parecido y no es la fuente.
    expect(layout).toMatch(/variable:\s*"--font-mono"/);
    expect(layout).toMatch(/\$\{\w+\.variable\}/);
  });
});

describe("aislamiento del portal (SC-007)", () => {
  const layout = readFileSync(`${PORTAL}/layout.tsx`, "utf8");

  it("el layout fuerza esquema claro", () => {
    expect(layout).toMatch(/colorScheme:\s*"light"/);
  });

  /**
   * El portal es una superficie pública que no debe heredar el tema del usuario
   * interno (FR-010). Consumir un token que cambia con `.dark` —`bg-bg`,
   * `text-ink`, `border-rule`— lo haría exactamente al revés: el cliente
   * externo vería la marca en oscuro porque alguien del estudio prefiere oscuro.
   */
  it("ninguna pantalla del portal consume tokens que cambian con el tema", () => {
    const THEMED = /\b(?:bg|text|border|divide|ring)-(?:bg|bg-2|ink|ink-soft|ink-faint|rule|rule-strong|surface|surface-2|surface-el|accent|accent-soft)\b/g;
    const found: string[] = [];
    for (const file of tsxFiles(PORTAL)) {
      const src = readFileSync(file, "utf8");
      src.split(/\r?\n/).forEach((text, i) => {
        THEMED.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = THEMED.exec(text))) {
          found.push(`  ${rel(file)}:${i + 1}  ${m[0]}`);
        }
      });
    }
    expect(
      found.join("\n"),
      `El portal heredaría el tema interno:\n${found.join("\n")}`
    ).toBe("");
  });
});
