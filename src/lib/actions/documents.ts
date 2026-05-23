"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/workspace";

/**
 * Registra en DB un documento ya subido a Vercel Blob por el cliente.
 * Verifica de nuevo acceso al proyecto (el token del upload también lo
 * verifica, pero esta action es la fuente de la fila en DB → defensa en
 * profundidad).
 */
export async function recordUploadedDocument(input: {
  projectId: string;
  taskId?: string | null;
  blobUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { userId } = await requireProjectAccess(input.projectId);
  const [doc] = await db
    .insert(documents)
    .values({
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      name: input.fileName,
      blobUrl: input.blobUrl,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedBy: userId,
    })
    .returning();
  revalidatePath(`/projects/${input.projectId}/documents`);
  return doc;
}

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
