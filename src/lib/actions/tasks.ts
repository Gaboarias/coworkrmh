"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, tags, taskTags } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
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
  const user = await requireUser();

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
  await requireUser();
  const completedAt =
    updates.status === "done"
      ? new Date()
      : updates.status !== undefined
      ? null
      : undefined;

  await db
    .update(tasks)
    .set({ ...updates, ...(completedAt !== undefined ? { completedAt } : {}), updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
  revalidatePath("/calendar");
}

export async function deleteTask(taskId: string, projectId: string) {
  await requireUser();
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
  await requireUser();
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
  await requireUser();
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
  await requireUser();
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  if (tagIds.length > 0) {
    await db
      .insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId, tagId })));
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function getTaskTagsForProject(
  projectId: string
): Promise<Record<string, string[]>> {
  await requireUser();
  const rows = await db
    .select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
    .from(taskTags)
    .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
    .where(eq(tasks.projectId, projectId));
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.taskId] ??= []).push(r.tagId);
  }
  return map;
}
