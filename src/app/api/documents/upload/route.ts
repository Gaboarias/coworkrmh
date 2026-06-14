import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireProjectAccess } from "@/lib/workspace";
import { logger } from "@/lib/logger";

/**
 * Upload client-side via @vercel/blob `handleUpload()`.
 *
 * Este patrón elimina el límite de 4 MB (cap de body de Vercel Functions)
 * porque el browser sube el archivo directamente al CDN de Vercel Blob —
 * la función solo genera el token de autorización y lo devuelve.
 *
 * Límite configurado: 500 MB por archivo.
 *
 * Flujo:
 *  1. Cliente POST { type: "blob.generate-client-token", payload: { pathname, callbackUrl, clientPayload } }
 *  2. onBeforeGenerateToken: valida auth + membresía → retorna token
 *  3. Browser PUT el archivo directo a Vercel Blob CDN con el token
 *  4. Cliente POST { type: "blob.upload-completed", ... } (auto, no-op acá)
 *  5. Cliente llama a /api/documents/register para guardar el record en DB
 *
 * Nota: BLOB_READ_WRITE_TOKEN sigue inyectándose en runtime incluso con
 * stores OIDC — handleUpload() lo lee automáticamente del env.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Lista de MIME types para el campo allowedContentTypes de handleUpload.
 * Vercel Blob rechaza uploads con tipos fuera de esta lista.
 * Si necesitás soportar un tipo nuevo, agregalo acá.
 */
// Lista plana para el campo allowedContentTypes de handleUpload.
// "*/*" no es seguro — preferimos listar tipos explícitamente.
const ALLOWED_CONTENT_TYPES: string[] = [
  "image/*",
  "video/*",
  "audio/*",
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
];

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validar auth + membresía antes de generar el token de upload.
        const { projectId } = JSON.parse(clientPayload || "{}") as {
          projectId?: string;
        };
        if (!projectId) throw new Error("projectId requerido en clientPayload");
        await requireProjectAccess(projectId);

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
          tokenPayload: clientPayload ?? "",
        };
      },
      onUploadCompleted: async () => {
        // no-op: el cliente guarda el record en DB vía /api/documents/register
        // después de que upload() resuelve. Así funciona en local dev (sin túnel).
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const e = err as Error;
    logger.error("UPL_FAIL", { message: e.message?.slice(0, 100) });
    return NextResponse.json(
      { error: e.message || "Error al procesar el upload" },
      { status: 400 }
    );
  }
}
