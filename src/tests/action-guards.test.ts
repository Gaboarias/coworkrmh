import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Todo server action exportado tiene que pasar por un guard de ./guards.
 *
 * Por qué un test y no una convención: los archivos de lib/actions son
 * `"use server"`, o sea que cada export es un endpoint HTTP invocable por
 * cualquier usuario autenticado con los argumentos que quiera. La firma no
 * dice nada sobre autorización, así que olvidarse es gratis y no lo detecta
 * ni el compilador ni el linter. Ya pasó: listClientProjects y
 * listClientPayments se publicaron sin chequeo de rol y cualquier `member`
 * podía leer los pagos de cualquier cliente.
 *
 * Esto no reemplaza pensar — un guard mal elegido sigue siendo un bug. Lo que
 * hace es que la AUSENCIA de guard sea imposible de mergear sin explicarla
 * acá abajo.
 */

const ACTIONS_DIR = path.resolve(__dirname, "..", "lib", "actions");

/** Llamadas que cuentan como autorización. */
const GUARDS = [
  "requireUser",
  "optionalUser", // lecturas que degradan a vacío; el llamador acota por el id

  "requireAdmin",
  "requireManagerOrAdmin",
  "requireClientRead", // alias local de requireManagerOrAdmin
  "requireWs",
  "requireWsCan",
  "requireProjectAccess",
  "requireProjectsManage", // envuelve requireWsCan("projects.manage")
  "requireWorkspaceManage",
  "requireWorkspaceOwner",
];

/**
 * Excepciones deliberadas. Agregar acá OBLIGA a escribir por qué — que es
 * justamente el punto. Formato: "archivo.ts:exportName" → motivo.
 */
const EXEMPT: Record<string, string> = {
  "clients.ts:getPortalDataByToken":
    "El portal del cliente no tiene sesión: el token UUID ES el gate. Añadir un guard de sesión lo rompería.",
  "notifications.ts:createNotification":
    "Helper interno: lo llaman otros actions ya autorizados, nunca el cliente directo.",
  "clientReports.ts:listPublishedReportsForClient":
    "La consume el portal del cliente, que por diseño no tiene sesión. El gate es el portalToken que ya validó getPortalDataByToken, y sólo devuelve reportes con published=true.",
};

/** Extrae los actions exportados y el cuerpo de cada uno. */
function parseActions(src: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  // `export async function foo(` | `export const foo = async (`
  const re =
    /export\s+(?:async\s+function\s+(\w+)|const\s+(\w+)\s*[:=][^=]*?=\s*async\s*\()/g;
  const hits: Array<{ name: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    hits.push({ name: m[1] ?? m[2], start: m.index });
  }
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].start : src.length;
    out.push({ name: hits[i].name, body: src.slice(hits[i].start, end) });
  }
  return out;
}

const files = fs
  .readdirSync(ACTIONS_DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .filter((f) => f !== "guards.ts" && f !== "erp.helpers.ts");

describe("server actions: autorización obligatoria", () => {
  it("encuentra archivos de actions para revisar", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const src = fs.readFileSync(path.join(ACTIONS_DIR, file), "utf8");
    const actions = parseActions(src);
    if (actions.length === 0) continue;

    describe(file, () => {
      for (const { name, body } of actions) {
        const key = `${file}:${name}`;
        const exemptReason = EXEMPT[key];

        it(`${name} pasa por un guard${exemptReason ? " (exento)" : ""}`, () => {
          const guarded = GUARDS.some((g) =>
            new RegExp(`\\b${g}\\s*\\(`).test(body)
          );
          if (exemptReason) {
            // Si un exento GANA un guard, sacarlo de la lista de excepciones.
            expect(
              guarded,
              `${key} está en EXEMPT pero ya usa un guard — quitalo de la lista`
            ).toBe(false);
            return;
          }
          expect(
            guarded,
            `${key} no llama a ningún guard (${GUARDS.join(", ")}). ` +
              `Si de verdad no lleva, agregalo a EXEMPT con el motivo.`
          ).toBe(true);
        });
      }
    });
  }
});
