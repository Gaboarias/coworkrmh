import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  processCampaignQueue,
  reclaimStalledSends,
} from "@/lib/marketing/processCampaign";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos

/** Comparación constante-time del CRON_SECRET (evita timing attacks). */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * GET /api/cron/process-campaign
 * Disparado por Vercel Cron (ver vercel.json). Vercel agrega
 * Authorization: Bearer ${CRON_SECRET} automáticamente.
 *
 * Actúa como RESPALDO: el launch dispara el procesamiento on-demand, y este
 * cron (cada 10 min) drena lo que haya quedado. Frecuencia baja a propósito
 * para que el compute de Neon pueda autosuspenderse cuando no hay envíos.
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    // Antes esto devolvía 200 con {skipped}. Vercel marcaba el cron como
    // exitoso, la cola no se drenaba nunca y NADA lo delataba: ni el
    // dashboard, ni los logs, ni la pantalla de la campaña. Un fallo de
    // configuración disfrazado de funcionamiento normal.
    //
    // En producción tiene que doler. Fuera de producción sigue siendo un
    // no-op silencioso, porque en local es normal no tener el cron armado.
    if (process.env.VERCEL_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET no configurado: la cola de campañas no se drena" },
        { status: 500 }
      );
    }
    return NextResponse.json({ skipped: "blaster no configurado" });
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Antes de drenar: rescatar lo que haya quedado trabado en `sending` por un
  // timeout o un deploy a mitad de camino. Va primero para que esas filas
  // vuelvan a `queued` y entren en esta misma pasada.
  const { requeued, abandoned } = await reclaimStalledSends();

  const processed = await processCampaignQueue();
  return NextResponse.json({ processed, requeued, abandoned });
}
