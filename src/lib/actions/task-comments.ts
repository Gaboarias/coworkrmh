"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskComments, tasks, users } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/workspace";

/**
 * Bitácora append-only de tareas.
 *
 * Reglas:
 *  - Cualquier project member puede crear / leer comentarios de la tarea.
 *  - NO hay edit (append-only por diseño).
 *  - Delete sólo permitido al autor durante los primeros 5 min (typo fix).
 *  - Después de 5 min queda inmutable para siempre.
 */

const DELETE_WINDOW_MS = 5 * 60 * 1000;

export interface TaskCommentRow {
  id: string;
  body: string;
  createdAt: string; // ISO
  author: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  canDelete: boolean; // true si el viewer es autor y está dentro de la ventana
}

/** Listar bitácora de una tarea — más reciente primero. */
export async function listTaskComments(
  taskId: string
): Promise<TaskCommentRow[]> {
  const session = await auth();
  if (!session?.user) return [];

  // Recuperar el projectId de la tarea para verificar acceso.
  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) return [];
  await requireProjectAccess(task.projectId);

  const rows = await db
    .select({
      id: taskComments.id,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      authorId: taskComments.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorAvatar: users.avatarUrl,
    })
    .from(taskComments)
    .innerJoin(users, eq(users.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt))
    .limit(500);

  const now = Date.now();
  const viewerId = session.user.id;
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.authorId,
      name: r.authorName,
      email: r.authorEmail ?? "",
      avatarUrl: r.authorAvatar,
    },
    canDelete:
      r.authorId === viewerId &&
      now - r.createdAt.getTime() < DELETE_WINDOW_MS,
  }));
}

/** Crear una entrada de bitácora. */
export async function createTaskComment(
  taskId: string,
  body: string
): Promise<TaskCommentRow> {
  const clean = body.trim();
  if (!clean) throw new Error("La nota no puede estar vacía");
  if (clean.length > 4000) {
    throw new Error("La nota es demasiado larga (máx 4000 caracteres)");
  }

  // Verificar la tarea + acceso al proyecto.
  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("Tarea no encontrada");

  const { userId } = await requireProjectAccess(task.projectId);

  const [inserted] = await db
    .insert(taskComments)
    .values({
      taskId,
      projectId: task.projectId,
      authorId: userId,
      body: clean,
    })
    .returning();

  // Cargar autor para devolver shape completo.
  const [author] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  revalidatePath(`/projects/${task.projectId}`);

  return {
    id: inserted.id,
    body: inserted.body,
    createdAt: inserted.createdAt.toISOString(),
    author: {
      id: author?.id ?? userId,
      name: author?.name ?? null,
      email: author?.email ?? "",
      avatarUrl: author?.avatarUrl ?? null,
    },
    canDelete: true,
  };
}

/**
 * Borrar una entrada de bitácora.
 * Sólo el autor, dentro de la ventana de DELETE_WINDOW_MS.
 */
export async function deleteTaskComment(commentId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const [row] = await db
    .select({
      authorId: taskComments.authorId,
      createdAt: taskComments.createdAt,
      projectId: taskComments.projectId,
    })
    .from(taskComments)
    .where(eq(taskComments.id, commentId))
    .limit(1);
  if (!row) throw new Error("Nota no encontrada");

  if (row.authorId !== session.user.id) {
    throw new Error("Solo el autor puede borrar su nota");
  }
  if (Date.now() - row.createdAt.getTime() >= DELETE_WINDOW_MS) {
    throw new Error(
      "La ventana de edición expiró (5 min). Las notas viejas son inmutables."
    );
  }

  await db
    .delete(taskComments)
    .where(
      and(
        eq(taskComments.id, commentId),
        eq(taskComments.authorId, session.user.id)
      )
    );

  revalidatePath(`/projects/${row.projectId}`);
}
