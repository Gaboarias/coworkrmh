import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/utils/uuid";
import { ensureWorkspaceForResource } from "@/lib/workspace";

/**
 * Cargar un proyecto desde un parámetro de ruta.
 *
 * Antes cada ruta bajo /projects/[projectId] repetía la misma secuencia a
 * mano: consultar por id, decidir si existe, y (a veces) chequear el entorno.
 * Eran nueve lugares respondiendo la misma pregunta con matices distintos —
 * y cuando hubo que agregar la validación de UUID, hubo que tocar tres.
 *
 * La validación de UUID no es opcional: `projects.id` es `uuid`, así que
 * compararlo contra "no-es-un-uuid" hace que Postgres tire "invalid input
 * syntax for type uuid" y la página termine en pantalla de error con HTTP 200
 * en vez de un 404.
 */

export type ProjectRow = typeof projects.$inferSelect;

/**
 * Devuelve el proyecto o corta con notFound(). Valida el formato del id antes
 * de tocar la DB. NO chequea entorno — para eso está loadProjectForRoute.
 */
export async function loadProject(projectId: string): Promise<ProjectRow> {
  if (!isUuid(projectId)) notFound();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) notFound();
  return project;
}

/**
 * Igual que loadProject, más el guard de entorno con auto-switch de deep-link:
 * si el usuario tiene acceso al entorno del proyecto pero está parado en otro,
 * lo cambia y vuelve a `nextPath`. Si no tiene acceso, notFound().
 *
 * Es lo que necesita una página de proyecto; el layout usa loadProject porque
 * el switch lo dispara la página con su propia ruta de retorno.
 */
export async function loadProjectForRoute(
  projectId: string,
  nextPath: string
): Promise<ProjectRow> {
  const project = await loadProject(projectId);
  await ensureWorkspaceForResource(project.workspaceId, nextPath);
  return project;
}
