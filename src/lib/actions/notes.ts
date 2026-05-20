"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canAccessWorkspace } from "@/lib/workspace";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/** Resuelve el workspaceId del proyecto y verifica que el usuario sea miembro.
 *  Lanza un error claro y diagnosticable si no aplica. */
async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  const [p] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!p) throw new Error("Proyecto no encontrado");
  if (!(await canAccessWorkspace(p.workspaceId))) {
    throw new Error("No tenés acceso al entorno de este proyecto");
  }
  return { user, workspaceId: p.workspaceId };
}

export async function createNote(formData: {
  projectId: string;
  title: string;
  taskId?: string;
}) {
  const { user } = await requireProjectAccess(formData.projectId);
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
  const { user } = await requireProjectAccess(projectId);
  // Defensa contra IDs cruzados: la nota debe pertenecer al projectId pasado.
  const [target] = await db
    .select({ projectId: notes.projectId })
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!target) throw new Error("Nota no encontrada");
  if (target.projectId !== projectId) {
    throw new Error("La nota no pertenece a este proyecto");
  }
  await db
    .update(notes)
    .set({ ...updates, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(notes.id, noteId));
  revalidatePath(`/projects/${projectId}/notes`);
  revalidatePath(`/projects/${projectId}/notes/${noteId}`);
}

export async function deleteNote(noteId: string, projectId: string) {
  await requireProjectAccess(projectId);
  const [target] = await db
    .select({ projectId: notes.projectId })
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!target) throw new Error("Nota no encontrada");
  if (target.projectId !== projectId) {
    throw new Error("La nota no pertenece a este proyecto");
  }
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath(`/projects/${projectId}/notes`);
}
