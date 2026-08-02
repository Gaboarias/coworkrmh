import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Densidad de las tablas del ERP — FR-006 y SC-006.
 *
 * SC-006 exige que el modo compacto muestre **al menos 40% más filas** que el
 * cómodo a la misma altura de pantalla. Hasta ahora eso era una afirmación sin
 * medir: el criterio existía en la spec y nadie había calculado si los valores
 * de `--erp-row-py` lo cumplían.
 *
 * También verifica lo que hacía fallar el requisito en la práctica: que las seis
 * vistas ERP consuman la variable. Tres de seis la ignoraban, así que la
 * preferencia del usuario funcionaba en la mitad de las pantallas.
 */

const CSS = readFileSync("src/app/globals.css", "utf8");

/** Alto del contenido de una fila, sin el padding vertical. Medido sobre las
 *  filas reales del ERP: una línea de 14px con line-height ~1.4 más el hairline. */
const CONTENT_PX = 21;

function remToPx(value: string): number {
  const m = /([\d.]+)rem/.exec(value);
  if (m) return parseFloat(m[1]) * 16;
  const px = /([\d.]+)px/.exec(value);
  return px ? parseFloat(px[1]) : NaN;
}

function tokenValue(selectorHint: string): number {
  const re = new RegExp(`${selectorHint}[^}]*--erp-row-py:\\s*([^;]+);`, "s");
  const m = re.exec(CSS);
  return m ? remToPx(m[1].trim()) : NaN;
}

const comfortable = tokenValue(":root");
const compact = tokenValue('html\\[data-density="compact"\\]');

/** Las seis vistas que FR-006 enumera. */
const ERP_VIEWS = [
  "src/app/(app)/operations/cotizador/page.tsx",
  "src/components/operations/CatalogView.tsx",
  "src/components/operations/SalesView.tsx",
  "src/components/operations/ExpensesView.tsx",
  "src/components/operations/TeamView.tsx",
  "src/components/clients/ClientsView.tsx",
];

describe("densidad de tablas ERP", () => {
  it("los dos valores de --erp-row-py están definidos", () => {
    expect(comfortable, "falta --erp-row-py en :root").toBeGreaterThan(0);
    expect(
      compact,
      'falta --erp-row-py en html[data-density="compact"]'
    ).toBeGreaterThan(0);
    expect(compact).toBeLessThan(comfortable);
  });

  it("SC-006: compacto muestra al menos 40% más filas que cómodo", () => {
    // Altura de fila = contenido + padding arriba y abajo.
    const rowComfortable = CONTENT_PX + comfortable * 2;
    const rowCompact = CONTENT_PX + compact * 2;
    // A la misma altura de pantalla, las filas que entran son inversamente
    // proporcionales a la altura de fila.
    const gain = rowComfortable / rowCompact - 1;

    expect(
      gain,
      `compacto rinde ${(gain * 100).toFixed(1)}% más filas ` +
        `(fila ${rowComfortable}px → ${rowCompact}px); SC-006 pide 40%`
    ).toBeGreaterThanOrEqual(0.4);
  });

  it("el margen de SC-006 aguanta filas más altas que la estimación", () => {
    // CONTENT_PX es una estimación, así que el criterio no debería depender de
    // que sea exacta. Se calcula hasta qué alto de contenido sigue cumpliendo:
    // (C + comfortable*2) / (C + compact*2) - 1 >= 0.4
    const delta = (comfortable - compact) * 2;
    const maxContent = delta / 0.4 - compact * 2;
    expect(
      maxContent,
      `SC-006 deja de cumplirse con filas de más de ${maxContent}px de contenido; ` +
        `la estimación usada es ${CONTENT_PX}px`
    ).toBeGreaterThan(CONTENT_PX * 1.5);
  });

  it("las seis vistas ERP consumen la variable", () => {
    const missing = ERP_VIEWS.filter((f) => {
      const src = readFileSync(f, "utf8");
      return !/--erp-row-py|h-list-dense/.test(src);
    });
    expect(
      missing.join(", "),
      "estas vistas ignoran la preferencia de densidad"
    ).toBe("");
  });

  it("las seis vistas montan el control", () => {
    const missing = ERP_VIEWS.filter(
      (f) => !readFileSync(f, "utf8").includes("DensityToggle")
    );
    expect(
      missing.join(", "),
      "estas vistas respetan la densidad pero no dejan cambiarla"
    ).toBe("");
  });
});
