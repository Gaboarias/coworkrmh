"use server";

import { db } from "@/lib/db";
import { tasks, projects, erpQuotes } from "@/lib/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { requireUser } from "./guards";

/**
 * Búsqueda de contenido para la paleta de comandos.
 *
 * La paleta prometía "Buscar acciones, páginas, proyectos…" en su placeholder y
 * sólo navegaba a rutas fijas: el propio código dejaba la búsqueda de contenido
 * anotada como "(Futuro N3+)". Para una herramienta que se aprende una vez y se
 * usa mil, esa es la mitad del valor de ⌘K — y prometerla sin darla es peor que
 * no ofrecerla.
 *
 * Sólo lectura, sin cambios de esquema. Todo acotado al entorno activo.
 */

export type SearchKind = "project" | "task" | "quote";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  /** Contexto para desambiguar dos resultados con el mismo nombre. */
  subtitle: string | null;
  href: string;
}

/** Por tipo, para que un proyecto con muchas tareas no tape a los demás. */
const PER_KIND = 5;
/** Menos de esto escanea sin discriminar y devuelve ruido. */
const MIN_QUERY = 2;

export async function searchWorkspace(query: string): Promise<SearchHit[]> {
  // `requireUser` es el piso; `getActiveWorkspace` acota al entorno al que esa
  // sesión tiene acceso. Sin el segundo, un `workspaceId` cualquiera en la
  // query devolvería datos de otro negocio: esto es un endpoint HTTP.
  await requireUser();

  const q = query.trim();
  if (q.length < MIN_QUERY) return [];

  const ws = await getActiveWorkspace();
  if (!ws) return [];

  // `%` y `_` son comodines de LIKE. Sin escaparlos, buscar "50%" recorre la
  // tabla entera y devuelve todo, que se lee como si el filtro no funcionara.
  const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const [projectRows, taskRows, quoteRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(and(eq(projects.workspaceId, ws.id), ilike(projects.name, pattern)))
      .orderBy(desc(projects.updatedAt))
      .limit(PER_KIND),

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        projectId: tasks.projectId,
        projectName: projects.name,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          ilike(tasks.title, pattern),
          sql`${tasks.status} != 'done'`
        )
      )
      .orderBy(desc(tasks.updatedAt))
      .limit(PER_KIND),

    db
      .select({
        id: erpQuotes.id,
        title: erpQuotes.title,
        customerName: erpQuotes.customerName,
      })
      .from(erpQuotes)
      .where(
        and(
          eq(erpQuotes.workspaceId, ws.id),
          or(
            ilike(erpQuotes.title, pattern),
            ilike(erpQuotes.customerName, pattern)
          )
        )
      )
      .orderBy(desc(erpQuotes.updatedAt))
      .limit(PER_KIND),
  ]);

  return [
    ...projectRows.map(
      (p): SearchHit => ({
        kind: "project",
        id: p.id,
        title: p.name,
        subtitle: p.status,
        href: `/projects/${p.id}`,
      })
    ),
    ...taskRows.map(
      (t): SearchHit => ({
        kind: "task",
        id: t.id,
        title: t.title,
        subtitle: t.projectName,
        href: `/projects/${t.projectId}?task=${t.id}`,
      })
    ),
    ...quoteRows.map(
      (q2): SearchHit => ({
        kind: "quote",
        id: q2.id,
        title: q2.title,
        subtitle: q2.customerName,
        href: `/operations/cotizador/${q2.id}`,
      })
    ),
  ];
}
