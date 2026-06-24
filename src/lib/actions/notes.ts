"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notes, projects, projectMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/workspace";
import { createNotification } from "@/lib/actions/notifications";

/** Título de una nota, para breadcrumbs. null si no existe o sin acceso. */
export async function getNoteTitle(noteId: string): Promise<string | null> {
  const [row] = await db
    .select({ title: notes.title, projectId: notes.projectId })
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!row) return null;
  try {
    await requireProjectAccess(row.projectId);
  } catch {
    return null;
  }
  return row.title;
}

export async function createNote(formData: {
  projectId: string;
  title: string;
  taskId?: string;
}) {
  const { userId } = await requireProjectAccess(formData.projectId);
  const [note] = await db
    .insert(notes)
    .values({
      projectId: formData.projectId,
      title: formData.title,
      taskId: formData.taskId ?? null,
      createdBy: userId,
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
  const { userId } = await requireProjectAccess(projectId);
  // Defensa contra IDs cruzados: la nota debe pertenecer al projectId pasado.
  const [target] = await db
    .select({ projectId: notes.projectId, contentText: notes.contentText })
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!target) throw new Error("Nota no encontrada");
  if (target.projectId !== projectId) {
    throw new Error("La nota no pertenece a este proyecto");
  }

  const prevContentText = target.contentText ?? "";

  await db
    .update(notes)
    .set({ ...updates, updatedBy: userId, updatedAt: new Date() })
    .where(eq(notes.id, noteId));

  // Notification trigger: note_mentioned.
  // Buscar nuevas menciones @username en el contentText (que no estaban antes).
  // Match heurístico: @<token> donde <token> match con users.name (lowercased,
  // sin espacios) o con email-prefix. Sólo notifica members del proyecto.
  if (updates.contentText) {
    await dispatchMentionNotifications({
      newText: updates.contentText,
      prevText: prevContentText,
      projectId,
      noteId,
      noteTitle: updates.title ?? "Nota",
      actorId: userId,
    });
  }

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

// ─── Mentions detector (helper) ──────────────────────────────────────────────

/**
 * Detecta @mentions nuevas (que no estaban en prevText) y notifica.
 *
 * Matching heurístico: para cada token `@<word>`, busca un member del proyecto
 * cuyo `users.name` (lowercased sin espacios) o email-prefix coincida.
 *
 * Limitación: si dos members tienen nombres similares (ej. "Juan Perez" y
 * "Juan Lopez"), el @juan puede ambiguar. Para autocompletion estricto usar
 * @<userId> markup desde el editor — pendiente implementar.
 */
async function dispatchMentionNotifications(params: {
  newText: string;
  prevText: string;
  projectId: string;
  noteId: string;
  noteTitle: string;
  actorId: string;
}) {
  const newMentions = extractMentions(params.newText);
  const oldMentions = new Set(extractMentions(params.prevText));
  const fresh = newMentions.filter((m) => !oldMentions.has(m));
  if (fresh.length === 0) return;

  // Las 3 queries de setup son independientes — paralelizar.
  const [members, [project], [actor]] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, email: users.email })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, params.projectId)),
    db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1),
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, params.actorId))
      .limit(1),
  ]);

  // Resolver cada mention a un userId (sin await en el loop).
  const toNotify: string[] = [];
  const notified = new Set<string>();
  for (const mention of fresh) {
    const m = mention.toLowerCase();
    const matches = members.filter((mem) => {
      const nameToken = (mem.name ?? "").toLowerCase().replace(/\s+/g, "");
      const emailPrefix = (mem.email ?? "").split("@")[0].toLowerCase();
      return nameToken === m || emailPrefix === m;
    });
    if (matches.length !== 1) continue; // Ambigüedad o no-match → skip.
    const target = matches[0];
    if (target.userId === params.actorId) continue; // No self-notify.
    if (notified.has(target.userId)) continue; // Dedup por user.
    notified.add(target.userId);
    toNotify.push(target.userId);
  }

  // Disparar todas las notificaciones en paralelo.
  await Promise.all(
    toNotify.map((userId) =>
      createNotification({
        userId,
        type: "note_mentioned",
        payload: {
          title: "Te mencionaron en una nota",
          body: `${params.noteTitle} — ${project?.name ?? "proyecto"}`,
          actorId: params.actorId,
          actorName: actor?.name ?? actor?.email ?? undefined,
          refs: { noteId: params.noteId, projectId: params.projectId },
        },
        href: `/projects/${params.projectId}/notes/${params.noteId}`,
      })
    )
  );
}

/**
 * Extrae los tokens `@palabra` (lowercased) del texto. Sólo letras + dígitos +
 * `.` `_` `-` después del `@` (típico user handle).
 */
function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@[a-zA-Z0-9._-]+/g) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}
