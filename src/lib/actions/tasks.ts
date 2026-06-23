"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tasks,
  tags,
  taskTags,
  taskAssignees,
  projects,
  projectMembers,
  workspaceMembers,
  users,
} from "@/lib/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";
import { createNotification } from "@/lib/actions/notifications";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/actions";

/**
 * Asegura que el assignee es project member. Si no lo es (pero sí es
 * workspace member del proyecto), lo agrega como `member`. Si no es
 * workspace member tampoco, tira (no se puede asignar a un user fuera
 * del entorno).
 *
 * Patrón "auto-magic": el UX no requiere agregar manualmente cada miembro
 * al proyecto antes de asignar. Permite que cualquier miembro del workspace
 * sea asignable, y se materializa la relación project ↔ user en el momento.
 */
async function ensureAssigneeIsProjectMember(
  projectId: string,
  assigneeId: string
): Promise<void> {
  // 1. ¿ya es project member? skip.
  const [existing] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, assigneeId)
      )
    )
    .limit(1);
  if (existing) return;

  // 2. ¿es workspace member del proyecto? si sí, auto-agregar.
  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    throw new Error("Proyecto no encontrado");
  }

  const [wsMember] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, assigneeId)
      )
    )
    .limit(1);

  if (!wsMember) {
    throw new Error(
      "El usuario no pertenece al entorno de este proyecto"
    );
  }

  // 3. Insert project member silently (onConflict do nothing — race safety).
  await db
    .insert(projectMembers)
    .values({ projectId, userId: assigneeId, role: "member" })
    .onConflictDoNothing({
      target: [projectMembers.projectId, projectMembers.userId],
    });
}

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/** Usuario autenticado con la capacidad `projects.manage` en el entorno activo. */
async function requireProjectsManage() {
  const [user, ws] = await Promise.all([requireUser(), getActiveWorkspace()]);
  if (!ws) throw new Error("Selecciona un entorno");
  const { permissions } = await getWorkspacePermissions(ws.id);
  if (!permissions.has("projects.manage")) {
    throw new Error(
      "No tenés permiso para gestionar tareas en este entorno"
    );
  }
  return user;
}

/**
 * Sincroniza el set de asignados de una tarea contra `userIds` (fuente de
 * verdad = tabla task_assignees). Auto-agrega cada uno como project member,
 * inserta los nuevos, borra los que ya no están, y mantiene
 * tasks.assignee_id = primer asignado (responsable primario denormalizado).
 * Devuelve el diff para disparar notificaciones.
 */
async function syncTaskAssignees(
  taskId: string,
  projectId: string,
  userIds: string[]
): Promise<{ added: string[]; all: string[] }> {
  // Dedup preservando orden (el primero es el responsable primario).
  const desired = Array.from(new Set(userIds));

  // Asegurar membership de cada asignado (tira si no es del workspace).
  await Promise.all(
    desired.map((uid) => ensureAssigneeIsProjectMember(projectId, uid))
  );

  const current = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, taskId));
  const currentSet = new Set(current.map((r) => r.userId));
  const desiredSet = new Set(desired);

  const added = desired.filter((uid) => !currentSet.has(uid));
  const removed = current
    .map((r) => r.userId)
    .filter((uid) => !desiredSet.has(uid));

  if (added.length) {
    await db
      .insert(taskAssignees)
      .values(added.map((uid) => ({ taskId, userId: uid })))
      .onConflictDoNothing();
  }
  if (removed.length) {
    await db
      .delete(taskAssignees)
      .where(
        and(
          eq(taskAssignees.taskId, taskId),
          inArray(taskAssignees.userId, removed)
        )
      );
  }

  // Responsable primario denormalizado (compat con queries que aún lo usan).
  await db
    .update(tasks)
    .set({ assigneeId: desired[0] ?? null })
    .where(eq(tasks.id, taskId));

  return { added, all: desired };
}

export type TaskAssigneeProfile = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

/**
 * Asignados (perfiles) para un set de tareas, agrupados por taskId. Una sola
 * query con JOIN a users. Usado por las páginas que listan tareas para mostrar
 * los avatares de todos los asignados.
 */
export async function getAssigneesForTasks(
  taskIds: string[]
): Promise<Record<string, TaskAssigneeProfile[]>> {
  if (taskIds.length === 0) return {};
  const rows = await db
    .select({
      taskId: taskAssignees.taskId,
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(inArray(taskAssignees.taskId, taskIds))
    .orderBy(asc(taskAssignees.assignedAt));

  const map: Record<string, TaskAssigneeProfile[]> = {};
  for (const r of rows) {
    (map[r.taskId] ??= []).push({
      id: r.id,
      name: r.name ?? null,
      email: r.email ?? "",
      avatarUrl: r.avatarUrl ?? null,
    });
  }
  return map;
}

export async function createTask(formData: {
  projectId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string;
  assigneeIds?: string[];
  dueDate?: string;
  parentTaskId?: string;
}) {
  createTaskSchema.parse(formData);
  const user = await requireProjectsManage();

  // Resolver lista de asignados — acepta assigneeIds[] (nuevo) o el legacy
  // assigneeId (single). Dedup preservando orden.
  const assigneeIds = Array.from(
    new Set(
      formData.assigneeIds ??
        (formData.assigneeId ? [formData.assigneeId] : [])
    )
  );

  // Auto-add cada asignado como project member (tira si no es del workspace).
  await Promise.all(
    assigneeIds.map((uid) =>
      ensureAssigneeIsProjectMember(formData.projectId, uid)
    )
  );

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: formData.projectId,
      title: formData.title,
      description: formData.description ?? null,
      priority: formData.priority ?? "medium",
      assigneeId: assigneeIds[0] ?? null,
      dueDate: formData.dueDate ?? null,
      parentTaskId: formData.parentTaskId ?? null,
      createdBy: user.id,
    })
    .returning();

  if (assigneeIds.length) {
    await db
      .insert(taskAssignees)
      .values(assigneeIds.map((uid) => ({ taskId: task.id, userId: uid })))
      .onConflictDoNothing();
  }

  revalidatePath(`/projects/${formData.projectId}`);
  revalidatePath("/my-tasks");
  revalidatePath("/calendar");

  // Notification trigger: notificar a cada asignado distinto del creador.
  const toNotify = assigneeIds.filter((uid) => uid !== user.id);
  if (toNotify.length) {
    const [project] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, formData.projectId))
      .limit(1);
    await Promise.all(
      toNotify.map((uid) =>
        createNotification({
          userId: uid,
          type: "task_assigned",
          payload: {
            title: "Te asignaron una tarea",
            body: `${formData.title} — ${project?.name ?? "proyecto"}`,
            actorId: user.id,
            actorName: user.name ?? user.email ?? undefined,
            refs: { taskId: task.id, projectId: formData.projectId },
          },
          href: `/projects/${formData.projectId}`,
        })
      )
    );
  }

  return task;
}

export async function updateTask(
  taskId: string,
  projectId: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: "todo" | "in_progress" | "review" | "done";
    priority?: "low" | "medium" | "high" | "urgent";
    assigneeId?: string | null;
    assigneeIds?: string[];
    dueDate?: string | null;
  }
) {
  updateTaskSchema.parse(updates);
  const user = await requireProjectsManage();
  const completedAt =
    updates.status === "done"
      ? new Date()
      : updates.status !== undefined
      ? null
      : undefined;

  // Set de asignados deseado — acepta assigneeIds[] (nuevo) o el legacy
  // assigneeId (single). undefined = no tocar asignados.
  const desiredAssignees: string[] | undefined =
    updates.assigneeIds ??
    (updates.assigneeId !== undefined
      ? updates.assigneeId
        ? [updates.assigneeId]
        : []
      : undefined);

  // Capturar estado anterior para los triggers de notificación.
  const needsPrev =
    desiredAssignees !== undefined || updates.status !== undefined;
  let prevStatus: string | null = null;
  let taskTitle: string | null = null;
  if (needsPrev) {
    const [prev] = await db
      .select({ title: tasks.title, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    prevStatus = prev?.status ?? null;
    taskTitle = prev?.title ?? null;
  }

  // Columnas directas (excluye los campos de asignado — van por sync, que
  // además mantiene tasks.assignee_id = primer asignado).
  const dbSet: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.title !== undefined) dbSet.title = updates.title;
  if (updates.description !== undefined) dbSet.description = updates.description;
  if (updates.status !== undefined) dbSet.status = updates.status;
  if (updates.priority !== undefined && updates.priority !== null)
    dbSet.priority = updates.priority;
  if (updates.dueDate !== undefined) dbSet.dueDate = updates.dueDate;
  if (completedAt !== undefined) dbSet.completedAt = completedAt;

  await db.update(tasks).set(dbSet).where(eq(tasks.id, taskId));

  // Sincronizar asignados (si se pidió). Devuelve los nuevos para notificar.
  let addedAssignees: string[] = [];
  if (desiredAssignees !== undefined) {
    const res = await syncTaskAssignees(taskId, projectId, desiredAssignees);
    addedAssignees = res.added;
  }

  // Lazy-load project name (sólo si algún trigger lo necesita).
  let projectName: string | null = null;
  const getProjectName = async (): Promise<string> => {
    if (projectName !== null) return projectName;
    const [project] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    projectName = project?.name ?? "proyecto";
    return projectName;
  };

  // Trigger 1: task_assigned — notificar a cada asignado NUEVO (≠ actor).
  const newAssignees = addedAssignees.filter((uid) => uid !== user.id);
  if (newAssignees.length) {
    const pname = await getProjectName();
    await Promise.all(
      newAssignees.map((uid) =>
        createNotification({
          userId: uid,
          type: "task_assigned",
          payload: {
            title: "Te asignaron una tarea",
            body: `${updates.title ?? taskTitle ?? "Tarea"} — ${pname}`,
            actorId: user.id,
            actorName: user.name ?? user.email ?? undefined,
            refs: { taskId, projectId },
          },
          href: `/projects/${projectId}`,
        })
      )
    );
  }

  // Trigger 2: task_status_changed — status cambió, notificar a TODOS los
  // asignados actuales (≠ actor). Refleja avance a todo el equipo de la tarea.
  if (updates.status && prevStatus && updates.status !== prevStatus) {
    const assignedRows = await db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, taskId));
    const recipients = assignedRows
      .map((r) => r.userId)
      .filter((uid) => uid !== user.id);
    if (recipients.length) {
      const statusLabels: Record<string, string> = {
        todo: "Por hacer",
        in_progress: "En curso",
        review: "En revisión",
        done: "Listo",
      };
      const pname = await getProjectName();
      await Promise.all(
        recipients.map((uid) =>
          createNotification({
            userId: uid,
            type: "task_status_changed",
            payload: {
              title: `Estado actualizado: ${statusLabels[updates.status!] ?? updates.status}`,
              body: `${taskTitle ?? "Tarea"} — ${pname}`,
              actorId: user.id,
              actorName: user.name ?? user.email ?? undefined,
              refs: { taskId, projectId },
            },
            href: `/projects/${projectId}`,
          })
        )
      );
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
  revalidatePath("/calendar");
}

export async function deleteTask(taskId: string, projectId: string) {
  await requireProjectsManage();
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
}

// ─── Subtareas ────────────────────────────────────────────────────────────────

export async function listSubtasks(parentTaskId: string) {
  await requireUser();
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentTaskId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
}

// ─── Etiquetas ────────────────────────────────────────────────────────────────

export async function listProjectTags(projectId: string) {
  await requireUser();
  return db
    .select()
    .from(tags)
    .where(eq(tags.projectId, projectId))
    .orderBy(asc(tags.name));
}

export async function createTag(formData: {
  projectId: string;
  name: string;
  color?: string;
}) {
  await requireProjectsManage();
  const [tag] = await db
    .insert(tags)
    .values({
      projectId: formData.projectId,
      name: formData.name.trim(),
      color: formData.color ?? "#6E83FF",
    })
    .returning();
  revalidatePath(`/projects/${formData.projectId}`);
  return tag;
}

export async function deleteTag(tagId: string, projectId: string) {
  await requireProjectsManage();
  await db.delete(tags).where(eq(tags.id, tagId));
  revalidatePath(`/projects/${projectId}`);
}

export async function getTaskTagIds(taskId: string): Promise<string[]> {
  await requireUser();
  const rows = await db
    .select({ tagId: taskTags.tagId })
    .from(taskTags)
    .where(eq(taskTags.taskId, taskId));
  return rows.map((r) => r.tagId);
}

export async function setTaskTags(
  taskId: string,
  projectId: string,
  tagIds: string[]
) {
  await requireProjectsManage();
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  if (tagIds.length > 0) {
    await db
      .insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId, tagId })));
  }
  revalidatePath(`/projects/${projectId}`);
}
