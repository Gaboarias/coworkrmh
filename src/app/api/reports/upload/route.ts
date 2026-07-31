import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/workspace";
import {
  isMimeAllowed,
  UPLOAD_MAX_BYTES,
  uploadErrorResponse,
} from "@/lib/uploads";

/**
 * Upload de archivos para el report builder — server-side con `put()`.
 * A diferencia de /api/documents/upload, NO inserta en la tabla documents:
 * solo sube el archivo y devuelve la URL para guardarla en client_reports.
 *
 * Validación de MIME y tamaño compartida con documents/upload (lib/uploads.ts).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Auth temprana: no bufferear el body de un usuario no autenticado.
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");

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
    if (file.size > UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el máximo de 4 MB" },
        { status: 400 }
      );
    }

    await requireProjectAccess(projectId);

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const blob = await put(`reports/${projectId}/${safeName}`, file, {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      mimeType: mime,
      sizeBytes: file.size,
    });
  } catch (err) {
    return uploadErrorResponse("reports/upload", err);
  }
}
