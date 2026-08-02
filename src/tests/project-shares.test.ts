import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/middleware";
import { projectShares } from "@/lib/db/schema";

/**
 * Links de sólo lectura a un proyecto.
 *
 * El riesgo acá no es que deje de funcionar — es que empiece a mostrar de más.
 * `getSharedProject` es la superficie pública entera: sin sesión, sin cuenta,
 * para cualquiera que tenga el link. Lo que se agregue a esa función se
 * publica, y es el tipo de cambio que en un diff se ve inocente ("agregué el
 * presupuesto a la vista compartida").
 *
 * Estos tests fijan qué NO puede aparecer ahí.
 */

const SRC = path.resolve(__dirname, "..");
const ACTIONS = fs.readFileSync(
  path.join(SRC, "lib", "actions", "projectShares.ts"),
  "utf8"
);

/** Cuerpo de la única función sin sesión. */
const publicSurface = ACTIONS.slice(
  ACTIONS.indexOf("export async function getSharedProject")
);

const matcher = (config.matcher as string[])[0];
const isGuarded = (p: string) => new RegExp(`^${matcher}$`).test(p);

describe("la vista compartida no filtra", () => {
  // Cada entrada es una tabla que está a un join de distancia y NO debe
  // aparecer. El motivo va en el mensaje: si alguien la agrega a propósito,
  // que tenga que borrar la línea de acá y leer por qué estaba.
  const PROHIBIDAS: [string, string][] = [
    ["erpQuotes", "las cotizaciones dicen cuánto cobramos"],
    ["erpQuoteItems", "el desglose de una cotización dice cómo lo calculamos"],
    ["erpSales", "las ventas son plata"],
    ["erpExpenses", "los gastos son plata"],
    ["erpTeam", "es la planilla del equipo"],
    ["payments", "los pagos son plata"],
    ["documents", "un documento puede tener cualquier cosa adentro"],
    ["notes", "las notas son escritura interna sin filtro"],
    ["taskComments", "los comentarios son conversación del equipo, a veces sobre el cliente"],
    ["changelog", "expone quién tocó qué y cuándo"],
    ["clients", "los datos del cliente son del cliente, no del proyecto"],
    ["taskAssignees", "el nombre de una persona es dato de ella"],
    ["workspaceMembers", "quién más está en el entorno no es asunto de quien mira un proyecto"],
  ];

  for (const [tabla, motivo] of PROHIBIDAS) {
    it(`no toca ${tabla} — ${motivo}`, () => {
      expect(
        new RegExp(`\\b${tabla}\\b`).test(publicSurface),
        `getSharedProject menciona ${tabla}: ${motivo}. Si de verdad tiene que salir en el link público, borrá esta línea del test y dejá escrito por qué.`
      ).toBe(false);
    });
  }

  it("de tasks sólo saca título, estado y fecha", () => {
    // La descripción de una tarea es donde el equipo escribe suelto. El
    // título alcanza para saber en qué se está trabajando.
    expect(publicSurface).toContain("title: tasks.title");
    expect(
      /description:\s*tasks\.description/.test(publicSurface),
      "la descripción de la tarea no va en la vista pública"
    ).toBe(false);
  });

  it("devuelve null sin distinguir revocado de vencido de inexistente", () => {
    // Al revés que una invitación: acá del otro lado no hay nadie a quien
    // ayudar a resolverlo, y "este link existió" no se le debe a un
    // desconocido. Los tres caminos dan null y la página hace notFound().
    expect(publicSurface).toContain("if (!share) return null;");
    expect(publicSurface).toContain("if (share.revokedAt) return null;");
    expect(publicSurface).toMatch(/expiresAt[\s\S]{0,60}return null;/);
  });
});

describe("gestión de links", () => {
  it("crear, listar y revocar exigen projects.manage", () => {
    // requireProjectManage resuelve el entorno DEL proyecto y pide la
    // capacidad ahí. El guard genérico requireProjectAccess sólo verifica
    // pertenencia al entorno — alcanzaría para leer, no para compartir afuera.
    for (const fn of [
      "createProjectShare",
      "listProjectShares",
      "revokeProjectShare",
    ]) {
      const cuerpo = ACTIONS.slice(ACTIONS.indexOf(`export async function ${fn}`));
      expect(
        /requireProjectManage\s*\(/.test(cuerpo.slice(0, 900)),
        `${fn} tiene que pasar por requireProjectManage`
      ).toBe(true);
    }
  });

  it("revocar resuelve el proyecto ANTES de autorizar", () => {
    const cuerpo = ACTIONS.slice(
      ACTIONS.indexOf("export async function revokeProjectShare")
    );
    // El id del link no dice de qué proyecto es. Autorizar primero contra el
    // proyecto "activo" y recién después buscar la fila sería un IDOR: se
    // podría revocar el link de un proyecto ajeno.
    const posSelect = cuerpo.indexOf(".from(projectShares)");
    const posGuard = cuerpo.indexOf("requireProjectManage(");
    expect(posSelect).toBeGreaterThan(-1);
    expect(posGuard).toBeGreaterThan(posSelect);
  });

  it("el token se guarda hasheado", () => {
    expect(Object.keys(projectShares)).toContain("tokenHash");
    expect(Object.keys(projectShares).filter((c) => /^token$/i.test(c))).toEqual(
      []
    );
    expect(ACTIONS).toContain("tokenHash: hashToken(");
  });
});

describe("ruta pública", () => {
  it("/share/<token> no pasa por el guard de sesión", () => {
    expect(isGuarded("/share/abc123")).toBe(false);
  });

  it("la página existe donde el link la busca", () => {
    expect(
      fs.existsSync(
        path.join(SRC, "app", "(portal)", "share", "[token]", "page.tsx")
      )
    ).toBe(true);
    expect(ACTIONS).toContain("/share/${");
  });

  it("la app sigue protegida", () => {
    for (const p of ["/projects", "/dashboard", "/operations"]) {
      expect(isGuarded(p)).toBe(true);
    }
  });
});
