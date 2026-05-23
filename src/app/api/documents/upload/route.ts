import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireProjectAccess } from "@/lib/workspace";

/**
 * Endpoint para uploads con cliente directo a Vercel Blob.
 * El browser sube DIRECTO a Blob storage saltando el límite ~4.5MB de las
 * Vercel Functions; esta ruta solo emite el token firmado tras verificar
 * acceso del usuario al proyecto. El registro en DB lo hace una server
 * action separada que el cliente llama tras la subida (sincronía simple).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // clientPayload = JSON { projectId, taskId? }
        if (!clientPayload) {
          throw new Error("Falta projectId");
        }
        const { projectId } = JSON.parse(clientPayload) as {
          projectId: string;
        };
        // Verifica auth + membresía del entorno (lanza si no aplica).
        await requireProjectAccess(projectId);
        return {
          allowedContentTypes: ["*/*"],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB
          // Pasamos el payload al callback de completed (no lo usamos acá
          // porque el insert lo hace el cliente vía server action).
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async () => {
        // Sin webhook: el cliente confirma la subida y llama a la server
        // action `recordUploadedDocument` para registrar en DB. Esto evita
        // la race entre el webhook y el router.refresh() del cliente.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Error procesando upload" },
      { status: 400 }
    );
  }
}
