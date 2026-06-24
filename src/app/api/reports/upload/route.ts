import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireProjectAccess } from "@/lib/workspace";

/**
 * Upload de archivos para el report builder — server-side con `put()`.
 * A diferencia de /api/documents/upload, NO inserta en la tabla documents:
 * solo sube el archivo y devuelve la URL para guardarla en client_reports.
 *
 * Límite ~4 MB (cap del body de Vercel Functions). Requiere
 * BLOB_READ_WRITE_TOKEN (inyectado al conectar el Blob store al proyecto).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
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
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el máximo de 4 MB" },
        { status: 400 }
      );
    }

    await requireProjectAccess(projectId);

    const mime = file.type || "application/octet-stream";
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
    const e = err as Error;
    console.error("[reports/upload] fail:", e?.name, "-", e?.message);
    return NextResponse.json(
      { error: e.message || "Error al subir el archivo" },
      { status: 400 }
    );
  }
}
