"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
}
