import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireProjectAccess } from "@/lib/workspace";

/**
 * Busca el token de Vercel Blob en cualquier env var que comience con
 * "vercel_blob_rw_". Necesario porque Vercel renombra el env var cuando
 * un store se conecta al proyecto (no siempre queda `BLOB_READ_WRITE_TOKEN`).
 * Sin esto, `handleUpload` falla aunque `put()` (server-side) funcione,
 * porque `put()` hace este fallback internamente pero `handleUpload` no.
 */
function findBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }
  for (const v of Object.values(process.env)) {
    if (typeof v === "string" && v.startsWith("vercel_blob_rw_")) {
      return v;
    }
  }
  return undefined;
}

/**
 * Endpoint para uploads con cliente directo a Vercel Blob.
 * El browser sube DIRECTO a Blob storage saltando el límite ~4.5MB de las
 * Vercel Functions; esta ruta solo emite el token firmado tras verificar
 * acceso del usuario al proyecto. El registro en DB lo hace una server
 * action separada que el cliente llama tras la subida (sincronía simple).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const token = findBlobToken();
  // Diagnóstico seguro del env var (no revela el secreto, solo si existe).
  console.error(
    `UPL_ENV len=${token?.length ?? 0} hasToken=${!!token}`
  );

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token, // ← explícito: arregla el caso del rename de env var
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
    // Categoriza el paso fallado en los primeros chars para que se vea en
    // el preview truncado de runtime logs.
    const e = err as Error;
    const msg = e.message || "(sin mensaje)";
    const step =
      msg.startsWith("No autenticado") ? "AUTH"
      : msg.startsWith("Proyecto no encontrado") ? "PROJECT"
      : msg.startsWith("No tenés acceso") || msg.startsWith("No tenes acceso") ? "ACCESS"
      : msg.toLowerCase().includes("blob") ? "BLOB"
      : msg.startsWith("Falta projectId") ? "PAYLOAD"
      : "OTHER";
    // Primero el step, después el mensaje truncado a 80 chars.
    console.error(`UPL_FAIL ${step}: ${msg.slice(0, 80)}`);
    return NextResponse.json(
      { error: msg, step, name: e.name },
      { status: 400 }
    );
  }
}
