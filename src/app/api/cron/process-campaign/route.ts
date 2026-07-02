import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processCampaignQueue } from "@/lib/marketing/processCampaign";

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
    // Sin CRON_SECRET el cron no puede autenticar y no hay nada que procesar
    // (el blaster no está configurado). No-op 200 para no ensuciar los logs.
    return NextResponse.json({ skipped: "blaster no configurado" });
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const processed = await processCampaignQueue();
  return NextResponse.json({ processed });
}
