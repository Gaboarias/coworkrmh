import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * POST /api/documents/register
 *
 * Guarda el registro del documento en DB después de que el cliente
 * completó el upload directo a Vercel Blob (vía @vercel/blob/client `upload()`).
 *
 * Body: { blobUrl, projectId, taskId?, name, mimeType, sizeBytes }
 *
 * Separamos el registro de DB del upload porque:
 * - El upload ocurre browser → Vercel Blob CDN (sin pasar por esta función)
 * - onUploadCompleted webhook requiere endpoint público (no funciona en local dev sin túnel)
 * - Este endpoint es síncrono desde el cliente, compatible con local dev
 */
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      blobUrl?: string;
      projectId?: string;
      taskId?: string | null;
      name?: string;
      mimeType?: string;
      sizeBytes?: number;
    };

    const { blobUrl, projectId, taskId, name, mimeType, sizeBytes } = body;

    if (!blobUrl || !projectId || !name || !mimeType || sizeBytes == null) {
      return NextResponse.json(
        {
          error:
            "Faltan parámetros (blobUrl, projectId, name, mimeType y sizeBytes son obligatorios)",
        },
        { status: 400 }
      );
    }

    // Validar auth + membresía al proyecto
    const { userId } = await requireProjectAccess(projectId);

    const [doc] = await db
      .insert(documents)
      .values({
        projectId,
        taskId: taskId ?? null,
        name,
        blobUrl,
        mimeType: mimeType || "application/octet-stream",
        sizeBytes,
        uploadedBy: userId,
      })
      .returning();

    revalidatePath(`/projects/${projectId}/documents`);
    return NextResponse.json({ document: doc });
  } catch (err) {
    const e = err as Error;
    logger.error("REG_FAIL", { message: e.message?.slice(0, 100) });
    return NextResponse.json(
      { error: e.message || "Error al registrar el documento" },
      { status: 400 }
    );
  }
}
