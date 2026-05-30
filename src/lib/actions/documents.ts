"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/workspace";

export async function deleteDocument(
  documentId: string,
  blobUrl: string,
  projectId: string
) {
  await requireProjectAccess(projectId);
  // Defensa: confirmar que la fila pertenece al projectId pasado.
  const [target] = await db
    .select({ projectId: documents.projectId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!target) throw new Error("Documento no encontrado");
  if (target.projectId !== projectId) {
    throw new Error("El documento no pertenece a este proyecto");
  }
  // Borrar primero el blob (best effort); si falla, igual borramos la fila
  // para no dejar huérfanos en DB. Loguear en producción si interesa.
  try {
    await del(blobUrl);
  } catch {
    // ignorar: la fila igual se elimina abajo
  }
  await db.delete(documents).where(eq(documents.id, documentId));
  revalidatePath(`/projects/${projectId}/documents`);
}
