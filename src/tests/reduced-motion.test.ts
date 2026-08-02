import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Test de conformidad de `prefers-reduced-motion`.
 *
 * Por qué existe: durante dos meses la documentación del proyecto afirmó que la
 * accesibilidad de movimiento estaba resuelta porque `MotionConfig
 * reducedMotion="user"` estaba cableado. Era falso. `MotionConfig` solo gobierna
 * componentes `motion.*`, y en todo el repo hay uno (`ui/Modal.tsx`); las otras
 * ~50 animaciones son clases de Tailwind y quedaban fuera de su alcance.
 *
 * El compilador no puede sostener esta regla: un bloque CSS que desaparece no
 * rompe ningún tipo. La constitución v1.0.1 exige un test cuando pasa eso.
 *
 * Este test no mide si la animación se ve bien. Verifica tres invariantes que,
 * si se pierden, devuelven la app al estado anterior sin que nadie se entere:
 *
 *   1. El bloque existe.
 *   2. Apunta a `*`, no a nombres de animación concretos — así una animación
 *      nueva queda cubierta sin que nadie tenga que acordarse.
 *   3. No mata las transiciones de color. `prefers-reduced-motion` pide menos
 *      movimiento, no menos contraste: sacar el feedback de hover/focus
 *      empeora la interfaz sin ganar accesibilidad.
 */

const CSS = readFileSync("src/app/globals.css", "utf8");
const TAILWIND = readFileSync("tailwind.config.ts", "utf8");

const MEDIA_QUERY = "@media (prefers-reduced-motion: reduce)";

/** Devuelve el cuerpo del bloque `@media`, balanceando llaves. */
function reducedMotionBlock(css: string): string | null {
  const start = css.indexOf(MEDIA_QUERY);
  if (start < 0) return null;
  const open = css.indexOf("{", start);
  if (open < 0) return null;

  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

const block = reducedMotionBlock(CSS);

/**
 * Parte el bloque en reglas `selector { cuerpo }`.
 *
 * Hace falta porque el bloque tiene dos reglas y no alcanza con preguntar si el
 * selector universal aparece "en algún lado": una versión anterior de este test
 * hacía eso y dejaba pasar que la regla de animación se acotara a nombres
 * concretos mientras la de transición seguía siendo universal.
 */
function rules(body: string): { selector: string; declarations: string }[] {
  // Los comentarios se sacan primero: van pegados al selector de la regla que
  // documentan y, sin esto, el selector se lee como `/* … */ *, *::before`.
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    declarations: m[2],
  }));
}

const BLOCK_RULES = block ? rules(block) : [];

/** La regla que declara `prop`, o undefined. */
const ruleFor = (prop: string) =>
  BLOCK_RULES.find((r) => r.declarations.includes(prop));

const isUniversal = (selector: string) =>
  /(^|,)\s*\*\s*(,|$)/.test(selector) || /^\s*\*\s*,/.test(selector);

/** Propiedades que SÍ deben seguir transicionando: son feedback de estado. */
const FEEDBACK_PROPS = ["color", "background-color", "border-color", "opacity"];

describe("prefers-reduced-motion", () => {
  it("globals.css declara el bloque", () => {
    expect(
      block,
      `Falta ${MEDIA_QUERY} en src/app/globals.css. Sin él, las ~50 animaciones ` +
        `de Tailwind ignoran la preferencia del sistema (constitución v1.0.1, principio III).`
    ).not.toBeNull();
  });

  it("neutraliza las animaciones con keyframes", () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("la regla de animación apunta al selector universal, no a nombres", () => {
    // Si alguien la reescribe como `.animate-slide-up { … }`, la próxima
    // animación que se agregue nace incumpliendo y nadie se entera.
    const rule = ruleFor("animation-duration");
    expect(rule, "ninguna regla del bloque declara animation-duration").toBeDefined();
    expect(
      isUniversal(rule!.selector),
      `la regla de animación debe apuntar a \`*\` para cubrir animaciones ` +
        `futuras sin mantenimiento; hoy apunta a: ${rule!.selector}`
    ).toBe(true);
  });

  it("la regla de transición también apunta al selector universal", () => {
    const rule = ruleFor("transition-property");
    expect(rule, "ninguna regla del bloque declara transition-property").toBeDefined();
    expect(
      isUniversal(rule!.selector),
      `hoy apunta a: ${rule!.selector}`
    ).toBe(true);
  });

  it("cubre toda animación declarada en tailwind.config.ts", () => {
    const declared = [
      ...TAILWIND.matchAll(/^\s*"([\w-]+)":\s*"[\w-]+ [\d.]+m?s/gm),
    ].map((m) => m[1]);
    // Guard: si el regex deja de encontrar animaciones, este test se volvería
    // vacío y siempre verde.
    expect(
      declared.length,
      "no se encontró ninguna animación en tailwind.config.ts"
    ).toBeGreaterThan(0);
    // Con el selector universal la cobertura es automática. Lo que se verifica
    // es que las pseudo-clases también estén, porque `animate-*` puede aplicarse
    // sobre ::before/::after.
    const rule = ruleFor("animation-duration");
    expect(rule!.selector).toContain("*::before");
    expect(rule!.selector).toContain("*::after");
  });

  it("NO mata las transiciones de color, fondo, borde ni opacidad", () => {
    // El error fácil al "simplificar" este bloque es poner
    // `transition-duration: 0.01ms !important` sobre `*`, que apaga también el
    // feedback de hover, focus y disabled.
    expect(
      block,
      "un `transition-duration` global apagaría el feedback de estado, no solo el movimiento"
    ).not.toMatch(/transition-duration:\s*0/);

    const allowList = block?.match(/transition-property:([^;]+);/)?.[1] ?? "";
    for (const prop of FEEDBACK_PROPS) {
      expect(allowList, `${prop} debe seguir transicionando`).toContain(prop);
    }
  });

  it("excluye transform de la lista, para que el movimiento sí se corte", () => {
    const allowList = block?.match(/transition-property:([^;]+);/)?.[1] ?? "";
    expect(allowList.length, "falta la lista de transition-property").toBeGreaterThan(0);
    expect(
      allowList,
      "si `transform` está en la lista, `hover:scale-110` y los translate siguen moviéndose"
    ).not.toContain("transform");
  });
});
