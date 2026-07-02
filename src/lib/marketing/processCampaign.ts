import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, campaignSends } from "@/lib/db/schema";
import {
  getMarketingResend,
  renderTemplate,
  unsubUrl,
} from "@/lib/marketing/resend";

const BATCH = 100; // límite del batch API de Resend

/**
 * Procesa UN lote de hasta 100 envíos `queued`:
 *   1. los marca `sending` de forma atómica (FOR UPDATE SKIP LOCKED),
 *   2. los envía agrupados por campaña vía Resend batch,
 *   3. marca `sent`/`failed` y cierra campañas sin pendientes.
 * Devuelve cuántos envíos procesó (0 = no había nada en cola).
 *
 * Compartido por el cron (`process-campaign`) y el disparo on-demand del launch.
 */
export async function processCampaignBatch(): Promise<number> {
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

  if (!sends.length) return 0;

  const resend = getMarketingResend();

  // Agrupar por campaña (mismo from/subject/html).
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

  // Cerrar campañas sin pendientes.
  await db.execute(sql`
    UPDATE campaigns SET status = 'sent'
    WHERE status = 'sending'
    AND id NOT IN (
      SELECT DISTINCT campaign_id FROM campaign_sends
      WHERE status IN ('queued','sending')
    )
  `);

  return sends.length;
}

/**
 * Drena la cola procesando lotes seguidos hasta vaciarla o hasta `maxBatches`
 * (tope para acotar la duración del request serverless). Devuelve el total
 * procesado. maxBatches=20 → hasta ~2000 envíos por invocación.
 */
export async function processCampaignQueue(maxBatches = 20): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const n = await processCampaignBatch();
    if (n === 0) break;
    total += n;
  }
  return total;
}
