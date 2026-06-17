import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, campaignSends } from "@/lib/db/schema";
import {
  getMarketingResend,
  renderTemplate,
  unsubUrl,
} from "@/lib/marketing/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos

const BATCH = 100; // límite del batch API de Resend

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
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) tomar un lote de 'queued' y marcarlo 'sending' de forma atómica.
  //    SKIP LOCKED permite varios crons en paralelo sin colisión.
  const batch = await db.execute(sql`
    UPDATE campaign_sends
    SET status = 'sending', updated_at = now()
    WHERE id IN (
      SELECT id FROM campaign_sends
      WHERE status = 'queued'
      ORDER BY updated_at ASC
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, campaign_id, email, merge_data, bucket_id
  `);

  const sends = batch.rows as Array<{
    id: string;
    campaign_id: string;
    email: string;
    merge_data: Record<string, unknown> | null;
    bucket_id: string;
  }>;

  if (!sends.length) return NextResponse.json({ processed: 0 });

  const resend = getMarketingResend();

  // 2) agrupar por campaña (mismo from/subject/html)
  const byCampaign = new Map<string, typeof sends>();
  for (const s of sends) {
    const arr = byCampaign.get(s.campaign_id) ?? [];
    arr.push(s);
    byCampaign.set(s.campaign_id, arr);
  }

  for (const [campaignId, group] of byCampaign) {
    const [c] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));
    if (!c) continue;

    const payload = group.map((s) => {
      const unsub = unsubUrl(s.email, s.bucket_id);
      const body =
        renderTemplate(c.html, s.merge_data ?? {}) +
        `<p style="font-size:12px;color:#888;margin-top:24px">` +
        `<a href="${unsub}">Cancelar suscripción</a></p>`;
      return {
        from: `${c.fromName} <${c.fromEmail}>`,
        to: s.email,
        subject: renderTemplate(c.subject, s.merge_data ?? {}),
        html: body,
        replyTo: c.replyTo ?? undefined,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    try {
      const { data, error } = await resend.batch.send(payload);
      if (error) throw error;

      // Resend respeta el orden del array → mapear ids por índice.
      const ids = (data?.data ?? []) as Array<{ id: string }>;
      await Promise.all(
        group.map((s, i) =>
          db
            .update(campaignSends)
            .set({
              status: "sent",
              providerMessageId: ids[i]?.id ?? null,
              sentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(campaignSends.id, s.id))
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await Promise.all(
        group.map((s) =>
          db
            .update(campaignSends)
            .set({ status: "failed", error: msg, updatedAt: new Date() })
            .where(eq(campaignSends.id, s.id))
        )
      );
    }
  }

  // 3) cerrar campañas sin pendientes
  await db.execute(sql`
    UPDATE campaigns SET status = 'sent'
    WHERE status = 'sending'
    AND id NOT IN (
      SELECT DISTINCT campaign_id FROM campaign_sends
      WHERE status IN ('queued','sending')
    )
  `);

  return NextResponse.json({ processed: sends.length });
}
