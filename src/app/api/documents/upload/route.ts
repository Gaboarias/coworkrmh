import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

/**
 * Upload server-side via @vercel/blob `put()`. Esta API funciona con el
 * modelo OIDC nuevo de Vercel Blob (la función obtiene credenciales con
 * su identidad runtime; no requiere BLOB_READ_WRITE_TOKEN estático).
 *
 * Límite: ~4 MB por archivo (cap de body size de Vercel Functions).
 * Para archivos más grandes habría que usar client uploads, que requieren
 * un token estático que Vercel ya no genera con stores nuevos OIDC-only.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel Function body cap)

/**
 * Allowlist de MIME types — bloquea ejecutables, scripts, HTML que podrían
 * usarse para XSS si se sirvieran desde el mismo origen (no es el caso —
 * Vercel Blob sirve desde *.public.blob.vercel-storage.com — pero queda como
 * defensa en profundidad).
 *
 * Si necesitás soportar un tipo nuevo, agregalo acá. Patrón `category/*`
 * para familias enteras (imágenes, video, audio).
 */
const ALLOWED_MIME_PATTERNS: RegExp[] = [
  /^image\//, // png, jpg, gif, webp, svg, etc.
  /^video\//, // mp4, mov, webm, etc.
  /^audio\//, // mp3, wav, ogg, etc.
  /^application\/pdf$/,
  /^application\/zip$/,
  /^application\/x-zip-compressed$/,
  /^application\/vnd\.openxmlformats-officedocument\./, // docx, xlsx, pptx
  /^application\/msword$/,
  /^application\/vnd\.ms-excel$/,
  /^application\/vnd\.ms-powerpoint$/,
  /^text\/plain$/,
  /^text\/csv$/,
  /^text\/markdown$/,
  /^application\/json$/,
];

function isMimeAllowed(mime: string): boolean {
  if (!mime) return false;
  return ALLOWED_MIME_PATTERNS.some((re) => re.test(mime));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const taskId = (formData.get("taskId") as string) || null;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "Faltan parámetros (file y projectId son obligatorios)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `El archivo excede el límite de 4 MB (${Math.round(
            file.size / 1024 / 1024
          )} MB).`,
        },
        { status: 413 }
      );
    }
    if (!isMimeAllowed(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido (${file.type || "desconocido"}).`,
        },
        { status: 415 }
      );
    }

    // Verifica auth + membresía del entorno del proyecto.
    const { userId } = await requireProjectAccess(projectId);

    // Path única para evitar colisiones; el nombre original queda en DB.
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const safePath = `${projectId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const blob = await put(safePath, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    const [doc] = await db
      .insert(documents)
      .values({
        projectId,
        taskId,
        name: file.name,
        blobUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedBy: userId,
      })
      .returning();

    revalidatePath(`/projects/${projectId}/documents`);
    return NextResponse.json({ document: doc });
  } catch (err) {
    const e = err as Error;
    console.error(`UPL_FAIL: ${e.message?.slice(0, 100)}`);
    return NextResponse.json(
      { error: e.message || "Error al subir el archivo" },
      { status: 400 }
    );
  }
}
