import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/utils/uuid";
import { auth } from "@/lib/auth";
import {
  ensureWorkspaceForResource,
  getVisibilityContext,
  canAccessWorkspace,
} from "@/lib/workspace";
import { canSeeProject } from "@/lib/projects/visibility";

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
 * de tocar la DB, y verifica que quien pregunta pueda verlo.
 *
 * El chequeo vive ACÁ y no sólo en loadProjectForRoute. Antes estaba allá, y
 * resulta que sólo `page.tsx` usa esa variante: el layout y las otras seis
 * subpáginas (notas, documentos, reportes, changelog, config) llamaban a
 * loadProject pelado. O sea que /projects/<id>/notes con el id de un proyecto
 * de OTRO entorno no cargaba las notas —los actions sí chequean— pero sí
 * mostraba el nombre, la descripción y las fechas en el encabezado.
 *
 * Es notFound() y no un error de permisos a propósito: "no tenés acceso"
 * confirma que el proyecto existe, y para alguien que no debería saber de él
 * eso ya es información.
 */
export async function loadProject(projectId: string): Promise<ProjectRow> {
  if (!isUuid(projectId)) notFound();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) notFound();

  if (!(await canAccessWorkspace(project.workspaceId))) notFound();

  // Y si además el proyecto está restringido, hay que ser del equipo.
  const session = await auth();
  if (session?.user) {
    const ctx = await getVisibilityContext(session.user.id, project.workspaceId);
    if (!(await canSeeProject(project, ctx))) notFound();
  }

  return project;
}

/**
 * Igual que loadProject, más el auto-switch de entorno para deep-links: si el
 * proyecto está en un entorno al que tenés acceso pero no es el activo, lo
 * cambia y vuelve a `nextPath`.
 *
 * Lo usa la página principal del proyecto, que es a donde llegan los links de
 * afuera. Las subpáginas alcanzan con loadProject: si llegaste a la de notas
 * es porque pasaste por la principal.
 */
export async function loadProjectForRoute(
  projectId: string,
  nextPath: string
): Promise<ProjectRow> {
  const project = await loadProject(projectId);
  await ensureWorkspaceForResource(project.workspaceId, nextPath);
  return project;
}
