import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { projects } from "@/lib/db/schema";

/**
 * Visibilidad de proyectos.
 *
 * La regla ("workspace" = todo el entorno, "members" = sólo el equipo) se
 * aplica en siete consultas distintas: la lista, el dashboard, el calendario,
 * ⌘K, las dos APIs mobile y los guards de página/action. Con que UNA se quede
 * sin el filtro, el proyecto restringido reaparece — y reaparece en silencio,
 * porque nadie tiene un proyecto restringido a mano para notarlo.
 *
 * Esto es un test de conformidad, no de comportamiento: no prueba que el SQL
 * devuelva lo correcto, prueba que ningún lugar se olvidó de preguntar. Es
 * exactamente el error que un test de comportamiento no agarra, porque el
 * lugar olvidado no tiene test.
 */

const SRC = path.resolve(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8");

/** Cada superficie que lista o carga proyectos. */
const SUPERFICIES: { archivo: string[]; que: string }[] = [
  { archivo: ["app", "(app)", "projects", "page.tsx"], que: "la lista de proyectos" },
  { archivo: ["app", "(app)", "dashboard", "page.tsx"], que: "el dashboard" },
  { archivo: ["app", "(app)", "calendar", "page.tsx"], que: "el calendario" },
  { archivo: ["lib", "actions", "search.ts"], que: "⌘K" },
  { archivo: ["app", "api", "mobile", "projects", "route.ts"], que: "la lista en mobile" },
  { archivo: ["app", "api", "mobile", "projects", "[id]", "route.ts"], que: "el detalle en mobile" },
];

/**
 * Extrae cada `.where(...)` con sus paréntesis balanceados.
 *
 * Mirar el archivo entero con `includes("visibleProjectsWhere")` NO sirve, y
 * lo comprobé: al sacarle el filtro a la query de proyectos de search.ts el
 * test seguía pasando, porque la query de tareas del mismo archivo lo
 * mencionaba. Un archivo con dos queries necesita que se mire cada una.
 */
function whereClauses(src: string): string[] {
  const out: string[] = [];
  const marca = ".where(";
  let i = src.indexOf(marca);
  while (i !== -1) {
    let depth = 0;
    let j = i + marca.length - 1;
    for (; j < src.length; j++) {
      if (src[j] === "(") depth++;
      else if (src[j] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(src.slice(i, j + 1));
    i = src.indexOf(marca, j);
  }
  return out;
}

describe("toda consulta que toca projects filtra por visibilidad", () => {
  for (const { archivo, que } of SUPERFICIES) {
    it(`${que}: ningún where se olvida del filtro`, () => {
      const src = read(...archivo);
      // Toda query de proyectos acota por entorno; ésa es la marca de que
      // estamos ante una, sea que liste proyectos o tareas con su proyecto.
      const relevantes = whereClauses(src).filter((w) =>
        w.includes("projects.workspaceId")
      );
      expect(
        relevantes.length,
        `${archivo.join("/")} no tiene ninguna query acotada por projects.workspaceId — ¿se movió a otro lado?`
      ).toBeGreaterThan(0);

      for (const w of relevantes) {
        expect(
          w.includes("visibleProjectsWhere") || /\bvisible\b/.test(w),
          `en ${archivo.join("/")} hay un where acotado por entorno y sin filtro de visibilidad — un proyecto restringido va a aparecer en ${que}:\n${w.slice(0, 400)}`
        ).toBe(true);
      }
    });
  }

  it("el detalle en mobile filtra igual que la lista", () => {
    // Filtrar sólo la lista es esconder el ícono y dejar la puerta abierta:
    // pedir el proyecto por id lo devolvía con sus tareas.
    const detalle = read("app", "api", "mobile", "projects", "[id]", "route.ts");
    expect(detalle).toContain("visibleProjectsWhere");
    expect(detalle).toContain("bearerVisibilityContext");
  });
});

describe("los guards también preguntan", () => {
  it("loadProject corta antes de devolver el proyecto", () => {
    const src = read("lib", "projects", "access.ts");
    // El chequeo tiene que estar en loadProject y no sólo en
    // loadProjectForRoute: seis de las siete subpáginas usan el primero.
    const load = src.slice(
      src.indexOf("export async function loadProject("),
      src.indexOf("export async function loadProjectForRoute")
    );
    expect(load).toContain("canSeeProject");
    expect(
      load.includes("canAccessWorkspace"),
      "loadProject sin canAccessWorkspace deja leer el nombre y las fechas de un proyecto de otro entorno"
    ).toBe(true);
  });

  it("requireProjectAccess corta para los actions", () => {
    // Es la puerta de tareas, notas y documentos. Sin esto, la página escondía
    // el proyecto pero los actions seguían sirviendo su contenido.
    const src = read("lib", "workspace.ts");
    const guard = src.slice(src.indexOf("export const requireProjectAccess"));
    expect(guard.slice(0, 1600)).toContain("canSeeProject");
  });

  it("updateProject pide el permiso en el entorno del proyecto", () => {
    const src = read("lib", "actions", "projects.ts");
    const fn = src.slice(
      src.indexOf("export async function updateProject"),
      src.indexOf("export async function getProjectName")
    );
    // requireProjectsManage (sin el "Project" singular) mira el entorno ACTIVO
    // y después deja escribir cualquier projectId — con permisos en un entorno
    // se podía editar, archivar y ahora restringir un proyecto de otro.
    expect(fn).toContain("requireProjectManage(projectId)");
  });
});

describe("el default no cambia nada al desplegar", () => {
  it("visibility arranca en workspace", () => {
    // Si el default fuera "members", los proyectos que ya existen
    // desaparecerían de la vista de casi todos en el momento del deploy —
    // porque hoy project_members sólo se llena al asignar una tarea.
    expect(projects.visibility.default).toBe("workspace");
    expect(projects.visibility.notNull).toBe(true);
  });

  it("filtrar es no-op para quien ve todo", () => {
    const src = read("lib", "projects", "visibility.ts");
    // Devolver undefined y no una condición siempre-verdadera: `and()` de
    // drizzle ignora undefined, así que el SQL de quien administra queda
    // idéntico al de antes de esta feature.
    expect(src).toContain("if (ctx.seesEverything) return undefined;");
  });

  it("usa EXISTS y no un JOIN contra project_members", () => {
    const src = read("lib", "projects", "visibility.ts");
    // Un join duplicaría la fila del proyecto por cada miembro y todos los
    // callers tendrían que acordarse de deduplicar.
    expect(src).toContain("exists(");
    expect(src).not.toContain("innerJoin(projectMembers");
  });
});
