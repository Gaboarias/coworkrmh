"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

export async function createNote(formData: {
  projectId: string;
  title: string;
  taskId?: string;
}) {
  const user = await requireUser();
  const [note] = await db
    .insert(notes)
    .values({
      projectId: formData.projectId,
      title: formData.title,
      taskId: formData.taskId ?? null,
      createdBy: user.id,
    })
    .returning();
  revalidatePath(`/projects/${formData.projectId}/notes`);
  return note;
}

export async function updateNote(
  noteId: string,
  projectId: string,
  updates: { title?: string; content?: unknown; contentText?: string }
) {
  const user = await requireUser();
  await db
    .update(notes)
    .set({ ...updates, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(notes.id, noteId));
  revalidatePath(`/projects/${projectId}/notes`);
}

export async function deleteNote(noteId: string, projectId: string) {
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath(`/projects/${projectId}/notes`);
}
