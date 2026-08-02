import { and, eq, exists, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";

/**
 * Quién ve qué proyecto.
 *
 * Un solo lugar porque la pregunta se hace en siete: la lista de proyectos, el
 * dashboard, el calendario, el buscador de ⌘K, los reportes, el guard de las
 * páginas de proyecto y el de los actions scopeados a proyecto. Siete copias
 * de una regla de acceso son siete lugares donde una puede quedarse vieja — y
 * el que se queda viejo no rompe nada visible, sólo muestra de más.
 *
 * La regla:
 *   visibility = "workspace" → cualquiera del entorno. Es el default y lo que
 *     la app hizo siempre.
 *   visibility = "members"   → el equipo del proyecto, más quien tenga
 *     `projects.manage` en el entorno.
 *
 * Sobre esa segunda mitad, para que nadie se confunda sobre qué tan fuerte es
 * esto: "restringido" acá quiere decir "fuera de la vista de quien no trabaja
 * en esto", no "secreto". Quien administra proyectos en el entorno lo sigue
 * viendo. Es a propósito — si no, el día que se va el último miembro el
 * proyecto queda sin nadie que pueda entrar. La UI lo dice con esas palabras;
 * una etiqueta de "privado" que no es privado es peor que no tener la función.
 */

/**
 * Quién pregunta. Lo arma `getVisibilityContext`, que vive en lib/workspace
 * porque ahí están los permisos — este módulo se queda sin importar nada de
 * allá para que no haya ciclo, ya que `requireProjectAccess` usa `canSeeProject`.
 */
export interface VisibilityContext {
  userId: string;
  /** Ve todos los proyectos del entorno, restringidos incluidos. */
  seesEverything: boolean;
}

/**
 * Contexto para las APIs mobile, que autentican con Bearer y no con la cookie
 * de NextAuth.
 *
 * `getVisibilityContext` no sirve ahí: resuelve permisos vía `auth()`, que
 * para un Bearer devuelve null — o sea que daría permisos vacíos igual, pero
 * por accidente y sin que se note. Esto lo hace explícito: en mobile, un
 * proyecto restringido pide ser miembro de verdad, sin el atajo de
 * `projects.manage`.
 *
 * La diferencia es siempre hacia el lado seguro: mobile muestra menos que la
 * web, nunca más. Si alguien administra proyectos y no ve uno restringido
 * desde el teléfono, se agrega al proyecto y listo.
 */
export function bearerVisibilityContext(userId: string): VisibilityContext {
  return { userId, seesEverything: false };
}

/**
 * Condición para un `where` sobre `projects`.
 *
 * Devuelve `undefined` cuando no hay nada que filtrar, que es lo que
 * `and(...)` de drizzle ignora — así el caller la compone sin ramificar.
 */
export function visibleProjectsWhere(ctx: VisibilityContext): SQL | undefined {
  if (ctx.seesEverything) return undefined;
  return or(
    eq(projects.visibility, "workspace"),
    // EXISTS y no un JOIN: un join contra project_members duplicaría la fila
    // del proyecto por cada miembro, y todos los callers tendrían que
    // acordarse de deduplicar. Este es justo el detalle que se pierde al
    // copiar la regla a siete lugares.
    exists(
      db
        .select({ ok: sql`1` })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projects.id),
            eq(projectMembers.userId, ctx.userId)
          )
        )
    )
  );
}

/** ¿Puede ver ESTE proyecto? Para el guard de una página o un action. */
export async function canSeeProject(
  project: { id: string; visibility: string },
  ctx: VisibilityContext
): Promise<boolean> {
  if (project.visibility !== "members") return true;
  if (ctx.seesEverything) return true;
  const [row] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, ctx.userId)
      )
    )
    .limit(1);
  return !!row;
}
