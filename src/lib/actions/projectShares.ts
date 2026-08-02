"use server";

/**
 * Links de sólo lectura a un proyecto.
 *
 * Es una LLAVE, no una invitación (ver el comentario de `project_shares` en
 * schema.ts). Quien tiene el link ve el avance sin cuenta y sin sesión, igual
 * que el portal del cliente.
 *
 * Lo que justifica la diferencia con las invitaciones a un entorno es esta
 * función: `getSharedProject` es la superficie pública entera, y devuelve una
 * lista cerrada de campos. Si algún día alguien le agrega un `select` de más,
 * el link deja de ser lo que dice ser — por eso el detalle de qué se expone
 * está escrito abajo, campo por campo.
 */

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  projectShares,
  projects,
  tasks,
  workspaces,
  users,
} from "@/lib/db/schema";
import { requireProjectManage } from "@/lib/workspace";
import { newToken, hashToken } from "@/lib/utils/token";
import { getAppUrl } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ProjectShareRow {
  id: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  createdByName: string | null;
}

/** Lo único que ve quien tiene el link. Lista cerrada a propósito. */
export interface SharedProject {
  projectName: string;
  description: string | null;
  status: string;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  workspaceName: string;
  tasks: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }[];
  counts: { total: number; done: number };
}

// Gestionar links exige `projects.manage` en el entorno DEL PROYECTO, que es
// lo que resuelve `requireProjectManage`. Contra el entorno ACTIVO no serviría:
// el projectId lo elige quien llama, así que dejaría pasar a alguien que
// administra proyectos en el suyo pero no en éste.

// ─── Gestión (con sesión) ─────────────────────────────────────────────────────

/** Crea un link y lo devuelve en claro. Es la única vez que existe sin hashear. */
export async function createProjectShare(
  projectId: string,
  opts: { label?: string | null; expiresInDays?: number | null } = {}
): Promise<{ id: string; url: string }> {
  const { userId } = await requireProjectManage(projectId);

  const raw = newToken();
  const days =
    typeof opts.expiresInDays === "number" && opts.expiresInDays > 0
      ? Math.min(Math.floor(opts.expiresInDays), 365)
      : null;

  const [row] = await db
    .insert(projectShares)
    .values({
      projectId,
      tokenHash: hashToken(raw),
      label: opts.label?.trim() || null,
      expiresAt: days ? new Date(Date.now() + days * DAY_MS) : null,
      createdBy: userId,
    })
    .returning({ id: projectShares.id });

  revalidatePath(`/projects/${projectId}/settings`);
  return { id: row.id, url: `${getAppUrl()}/share/${raw}` };
}

export async function listProjectShares(
  projectId: string
): Promise<ProjectShareRow[]> {
  await requireProjectManage(projectId);
  const rows = await db
    .select({
      id: projectShares.id,
      label: projectShares.label,
      expiresAt: projectShares.expiresAt,
      revokedAt: projectShares.revokedAt,
      viewCount: projectShares.viewCount,
      lastViewedAt: projectShares.lastViewedAt,
      createdAt: projectShares.createdAt,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(projectShares)
    .leftJoin(users, eq(users.id, projectShares.createdBy))
    .where(eq(projectShares.projectId, projectId))
    .orderBy(desc(projectShares.createdAt));

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    viewCount: r.viewCount,
    lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdByName ?? r.createdByEmail ?? null,
  }));
}

/** Corta el link. La fila queda, con su historial de vistas. */
export async function revokeProjectShare(shareId: string): Promise<void> {
  // El id del link no dice de qué proyecto es: se resuelve primero y se
  // autoriza después. Al revés sería un IDOR.
  const [row] = await db
    .select({ projectId: projectShares.projectId })
    .from(projectShares)
    .where(eq(projectShares.id, shareId))
    .limit(1);
  if (!row) throw new Error("Link no encontrado");

  await requireProjectManage(row.projectId);

  await db
    .update(projectShares)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(projectShares.id, shareId), isNull(projectShares.revokedAt))
    );
  revalidatePath(`/projects/${row.projectId}/settings`);
}

// ─── Superficie pública (sin sesión) ──────────────────────────────────────────

/**
 * El proyecto visto desde el link. Sin sesión: el token ES el gate.
 *
 * QUÉ SE EXPONE, y por qué la lista es corta:
 *   nombre, descripción, estado, color, fechas → es el avance, que es el
 *     punto entero de compartir.
 *   tareas: título, estado, fecha → deja ver en qué se está trabajando.
 *
 * QUÉ NO, aunque esté a un join de distancia:
 *   plata (cotizaciones, pagos, márgenes) — un link reenviado no puede
 *     terminar mostrando lo que cobramos.
 *   documentos y notas — pueden tener cualquier cosa adentro; no hay forma de
 *     garantizar que sean aptos para afuera.
 *   comentarios — son conversación interna del equipo sobre el trabajo, y a
 *     veces sobre el cliente.
 *   quién está asignado — el nombre de una persona es dato de ella, no del
 *     proyecto, y no hace falta para entender el avance.
 *   descripción de cada tarea — el título alcanza para saber qué es; la
 *     descripción es donde el equipo escribe suelto.
 */
export async function getSharedProject(
  rawToken: string
): Promise<SharedProject | null> {
  if (!rawToken) return null;

  const [share] = await db
    .select({
      id: projectShares.id,
      projectId: projectShares.projectId,
      expiresAt: projectShares.expiresAt,
      revokedAt: projectShares.revokedAt,
      projectName: projects.name,
      description: projects.description,
      status: projects.status,
      color: projects.color,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      workspaceName: workspaces.name,
    })
    .from(projectShares)
    .innerJoin(projects, eq(projects.id, projectShares.projectId))
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .where(eq(projectShares.tokenHash, hashToken(rawToken)))
    .limit(1);

  if (!share) return null;
  if (share.revokedAt) return null;
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return null;

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    // Sólo tareas de primer nivel: las subtareas son el detalle de cómo el
    // equipo se organiza adentro, y llenarían la pantalla de ruido.
    .where(and(eq(tasks.projectId, share.projectId), isNull(tasks.parentTaskId)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  // Contador de vistas. Sin await: si esta escritura falla o tarda, la persona
  // igual tiene que ver su proyecto — es telemetría, no parte de la respuesta.
  void db
    .update(projectShares)
    .set({
      viewCount: sql`${projectShares.viewCount} + 1`,
      lastViewedAt: new Date(),
    })
    .where(eq(projectShares.id, share.id))
    .catch(() => {});

  return {
    projectName: share.projectName,
    description: share.description,
    status: share.status,
    color: share.color,
    startDate: share.startDate,
    dueDate: share.dueDate,
    workspaceName: share.workspaceName,
    tasks: rows.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
    })),
    counts: {
      total: rows.length,
      done: rows.filter((t) => t.status === "done").length,
    },
  };
}
