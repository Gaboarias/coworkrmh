/**
 * Cron de retención: poda email_events más viejos que EMAIL_EVENTS_RETENTION_DAYS
 * (default 90). email_events es la tabla de mayor crecimiento del blaster
 * (1 fila por cada open/click/delivered/bounce por destinatario) y puede llenar
 * el storage de Neon. Podarla NO afecta:
 *   - supresiones (viven en `suppressions`),
 *   - métricas por status (viven en `campaign_sends`).
 * Solo se pierden las tasas de open/click ÚNICOS de campañas más viejas que la
 * ventana de retención — aceptable.
 *
 * Schedule: ver vercel.json (diario). Auth: Bearer CRON_SECRET (Vercel lo
 * agrega solo). Sin CRON_SECRET → no-op 200 (no ensucia logs).
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

const DEFAULT_RETENTION_DAYS = 90;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ skipped: "CRON_SECRET no configurado" });
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseInt(
    process.env.EMAIL_EVENTS_RETENTION_DAYS ?? "",
    10
  );
  const days =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;

  const res = await db.execute(sql`
    DELETE FROM email_events
    WHERE created_at < now() - (${days} || ' days')::interval
  `);

  return NextResponse.json({
    ok: true,
    retentionDays: days,
    deleted: res.rowCount ?? 0,
    prunedAt: new Date().toISOString(),
  });
}
