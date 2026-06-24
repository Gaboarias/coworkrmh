import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

/**
 * Upload de documentos — server-side con `put()` de @vercel/blob.
 *
 * El archivo pasa por esta función (multipart FormData), se sube a Vercel Blob
 * y se registra en DB en una sola llamada. Simple y directo.
 *
 * Límite: ~4 MB por archivo (cap del body de las Vercel Functions). Para
 * archivos más grandes habría que volver a client uploads (handleUpload), pero
 * eso requiere un BLOB_READ_WRITE_TOKEN estático bien configurado.
 *
 * Requiere BLOB_READ_WRITE_TOKEN en el entorno (Vercel lo inyecta al conectar
 * un Blob store al proyecto).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_EXACT = new Set<string>([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);

function isMimeAllowed(m: string): boolean {
  if (!m) return false;
  if (ALLOWED_PREFIXES.some((p) => m.startsWith(p))) return true;
  return ALLOWED_EXACT.has(m);
}

// Cap práctico del body de funciones Vercel (~4.5 MB). Dejamos 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const taskIdRaw = form.get("taskId");
    const taskId =
      taskIdRaw && taskIdRaw !== "null" ? String(taskIdRaw) : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo faltante" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId requerido" },
        { status: 400 }
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!isMimeAllowed(mime)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido (${mime})` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el máximo de 4 MB" },
        { status: 400 }
      );
    }

    // Auth + membresía al proyecto.
    const { userId } = await requireProjectAccess(projectId);

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const blob = await put(`documents/${projectId}/${safeName}`, file, {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    });

    const [doc] = await db
      .insert(documents)
      .values({
        projectId,
        taskId,
        name: file.name,
        blobUrl: blob.url,
        mimeType: mime,
        sizeBytes: file.size,
        uploadedBy: userId,
      })
      .returning();

    revalidatePath(`/projects/${projectId}/documents`);
    return NextResponse.json({ document: doc });
  } catch (err) {
    const e = err as Error;
    console.error("[documents/upload] fail:", e?.name, "-", e?.message);
    return NextResponse.json(
      { error: e.message || "Error al subir el archivo" },
      { status: 400 }
    );
  }
}
