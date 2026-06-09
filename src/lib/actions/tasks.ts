"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tasks,
  tags,
  taskTags,
  projects,
  projectMembers,
  workspaceMembers,
} from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";
import { createNotification } from "@/lib/actions/notifications";

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

export async function createTask(formData: {
  projectId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string;
  dueDate?: string;
  parentTaskId?: string;
}) {
  const user = await requireProjectsManage();

  // Auto-add assignee como project member si es workspace member pero no
  // project member todavía. Tira si no pertenece ni al workspace.
  if (formData.assigneeId) {
    await ensureAssigneeIsProjectMember(
      formData.projectId,
      formData.assigneeId
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: formData.projectId,
      title: formData.title,
      description: formData.description ?? null,
      priority: formData.priority ?? "medium",
      assigneeId: formData.assigneeId ?? null,
      dueDate: formData.dueDate ?? null,
      parentTaskId: formData.parentTaskId ?? null,
      createdBy: user.id,
    })
    .returning();

  revalidatePath(`/projects/${formData.projectId}`);

  // Notification trigger: si la tarea se crea ya asignada a alguien, notificar.
  if (formData.assigneeId && formData.assigneeId !== user.id) {
    const [project] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, formData.projectId))
      .limit(1);
    await createNotification({
      userId: formData.assigneeId,
      type: "task_assigned",
      payload: {
        title: "Te asignaron una tarea",
        body: `${formData.title} — ${project?.name ?? "proyecto"}`,
        actorId: user.id,
        actorName: user.name ?? user.email ?? undefined,
        refs: { taskId: task.id, projectId: formData.projectId },
      },
      href: `/projects/${formData.projectId}`,
    });
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
    dueDate?: string | null;
  }
) {
  const user = await requireProjectsManage();
  const completedAt =
    updates.status === "done"
      ? new Date()
      : updates.status !== undefined
      ? null
      : undefined;

  // Capturar estado anterior para detectar cambios (notification triggers).
  // Levantamos assigneeId + title siempre (los necesitamos para varios triggers),
  // y status para el task_status_changed trigger.
  const needsPrev =
    updates.assigneeId !== undefined || updates.status !== undefined;
  let prevAssigneeId: string | null = null;
  let prevStatus: string | null = null;
  let taskTitle: string | null = null;
  let taskAssigneeId: string | null = null;
  if (needsPrev) {
    const [prev] = await db
      .select({
        assigneeId: tasks.assigneeId,
        title: tasks.title,
        status: tasks.status,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    prevAssigneeId = prev?.assigneeId ?? null;
    prevStatus = prev?.status ?? null;
    taskTitle = prev?.title ?? null;
    taskAssigneeId = prev?.assigneeId ?? null;
  }

  // Auto-add assignee como project member si cambió y necesita ser materializado.
  if (
    updates.assigneeId &&
    updates.assigneeId !== prevAssigneeId
  ) {
    await ensureAssigneeIsProjectMember(projectId, updates.assigneeId);
  }

  await db
    .update(tasks)
    .set({ ...updates, ...(completedAt !== undefined ? { completedAt } : {}), updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

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

  // Trigger 1: task_assigned — assigneeId cambió a alguien distinto del actor.
  if (
    updates.assigneeId &&
    updates.assigneeId !== prevAssigneeId &&
    updates.assigneeId !== user.id
  ) {
    await createNotification({
      userId: updates.assigneeId,
      type: "task_assigned",
      payload: {
        title: "Te asignaron una tarea",
        body: `${updates.title ?? taskTitle ?? "Tarea"} — ${await getProjectName()}`,
        actorId: user.id,
        actorName: user.name ?? user.email ?? undefined,
        refs: { taskId, projectId },
      },
      href: `/projects/${projectId}`,
    });
  }

  // Trigger 2: task_status_changed — status cambió, notificar al assignee
  // (si no es el actor). Útil para reflejar avance de tareas que asignaste.
  if (
    updates.status &&
    prevStatus &&
    updates.status !== prevStatus &&
    taskAssigneeId &&
    taskAssigneeId !== user.id
  ) {
    const statusLabels: Record<string, string> = {
      todo: "Por hacer",
      in_progress: "En curso",
      review: "En revisión",
      done: "Listo",
    };
    await createNotification({
      userId: taskAssigneeId,
      type: "task_status_changed",
      payload: {
        title: `Estado actualizado: ${statusLabels[updates.status] ?? updates.status}`,
        body: `${taskTitle ?? "Tarea"} — ${await getProjectName()}`,
        actorId: user.id,
        actorName: user.name ?? user.email ?? undefined,
        refs: { taskId, projectId },
      },
      href: `/projects/${projectId}`,
    });
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
