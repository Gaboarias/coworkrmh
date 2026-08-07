import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, campaignSends } from "@/lib/db/schema";
import {
  assertMarketingConfigured,
  getMarketingResend,
  renderTemplate,
  unsubUrl,
} from "@/lib/marketing/resend";
import { logger } from "@/lib/logger";

const BATCH = 100; // límite del batch API de Resend

/**
 * Minutos tras los cuales un envío en `sending` se considera abandonado.
 *
 * Tiene que ser holgadamente mayor que el `maxDuration` de la función (60s)
 * para no pisar nunca un lote que todavía está en vuelo.
 */
const STALE_MIN = 15;

/**
 * Cuántas veces se reencola un envío abandonado antes de darlo por muerto.
 *
 * Acota la duplicación en el peor caso: si el proceso se corta DESPUÉS de que
 * Resend aceptó el correo y ANTES de que escribamos `sent`, reintentar manda
 * una segunda copia. Dos copias es tolerable; un ciclo infinito de copias no.
 */
const MAX_ATTEMPTS = 2;

/**
 * Rescata envíos que quedaron en `sending` sin que nadie los cierre.
 *
 * Cubre una clase de fallo que ninguna validación previa puede cubrir: timeout
 * de la función, OOM, un deploy en medio de la ejecución, la conexión a Neon
 * que se corta después del commit del claim. En todos esos casos NO corre
 * código nuestro — no hay excepción que atrapar, el proceso deja de existir.
 *
 * Sin esto, esas filas quedaban en `sending` para siempre: el cron sólo mira
 * `queued`, y la campaña nunca cierra porque la query de cierre excluye
 * campañas con envíos en `sending`.
 *
 * No reemplaza a `assertMarketingConfigured` y viceversa: aquello cubre los
 * fallos determinísticos de configuración (que se repetirían en cada corrida),
 * esto cubre los no determinísticos de infraestructura.
 */
export async function reclaimStalledSends(): Promise<{
  requeued: number;
  abandoned: number;
}> {
  // Primero los que agotaron reintentos: se marcan muertos para que no roten
  // eternamente. Antes que los otros, para que no se reencolen en esta misma
  // pasada.
  const dead = await db.execute(sql`
    UPDATE campaign_sends
    SET status = 'failed',
        error = 'Envío interrumpido; se agotaron los reintentos (no se reintenta más para no duplicar).',
        updated_at = now()
    WHERE status = 'sending'
      AND updated_at < now() - (${STALE_MIN} * interval '1 minute')
      AND attempts >= ${MAX_ATTEMPTS}
    RETURNING id
  `);

  const back = await db.execute(sql`
    UPDATE campaign_sends
    SET status = 'queued', updated_at = now()
    WHERE status = 'sending'
      AND updated_at < now() - (${STALE_MIN} * interval '1 minute')
      AND attempts < ${MAX_ATTEMPTS}
    RETURNING id
  `);

  const requeued = back.rows.length;
  const abandoned = dead.rows.length;
  if (requeued || abandoned) {
    logger.warn("blaster.reclaim", { requeued, abandoned, staleMin: STALE_MIN });
  }
  return { requeued, abandoned };
}

/**
 * Procesa UN lote de hasta 100 envíos `queued`:
 *   1. verifica que el blaster esté configurado (ANTES de tocar la cola),
 *   2. los marca `sending` de forma atómica (FOR UPDATE SKIP LOCKED),
 *   3. descarta a quien se dio de baja mientras tanto,
 *   4. los envía agrupados por campaña vía Resend batch,
 *   5. marca `sent`/`failed` y cierra campañas sin pendientes.
 * Devuelve cuántos envíos procesó (0 = no había nada en cola).
 *
 * Compartido por el cron (`process-campaign`) y el disparo on-demand del launch.
 */
export async function processCampaignBatch(): Promise<number> {
  // Primera línea, antes del claim. Si falta una variable, la cola queda
  // intacta y el error dice cuál — en vez de dejar 100 filas trabadas.
  assertMarketingConfigured();

  const batch = await db.execute(sql`
    UPDATE campaign_sends
    SET status = 'sending', attempts = attempts + 1, updated_at = now()
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

  /**
   * Re-chequeo de bajas.
   *
   * `resolveSegment` ya filtra supresiones al lanzar, pero entre el lanzamiento
   * y este lote pueden pasar horas: una campaña grande se drena por cron cada
   * 10 minutos. Sin esto, a alguien que se dio de baja después de lanzar se le
   * seguía enviando — que es exactamente lo que la baja promete que no pasa.
   */
  const suprimidos = await db.execute(sql`
    SELECT s.email, s.bucket_id
    FROM suppressions s
    WHERE (s.email, s.bucket_id) IN (
      ${sql.join(
        sends.map((s) => sql`(${s.email.toLowerCase()}, ${s.bucket_id})`),
        sql`, `
      )}
    )
  `);
  const bloqueados = new Set(
    (suprimidos.rows as Array<{ email: string; bucket_id: string }>).map(
      (r) => `${r.email.toLowerCase()}:${r.bucket_id}`
    )
  );

  const envíos = sends.filter(
    (s) => !bloqueados.has(`${s.email.toLowerCase()}:${s.bucket_id}`)
  );
  const saltados = sends.filter((s) =>
    bloqueados.has(`${s.email.toLowerCase()}:${s.bucket_id}`)
  );

  if (saltados.length) {
    // `suppressed` y no `failed`: no falló nada, se respetó una baja. Mezclarlo
    // con los fallos reales haría que la métrica de errores mienta.
    await db.execute(sql`
      UPDATE campaign_sends
      SET status = 'suppressed', updated_at = now()
      WHERE id IN (${sql.join(
        saltados.map((s) => sql`${s.id}`),
        sql`, `
      )})
    `);
    logger.warn("blaster.suppressed_at_send", { n: saltados.length });
  }

  if (envíos.length) {
    const resend = getMarketingResend();

    // Agrupar por campaña (mismo from/subject/html).
    const byCampaign = new Map<string, typeof envíos>();
    for (const s of envíos) {
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

      // El try abarca también la construcción del payload, no sólo el envío.
      // Antes abría después, así que un fallo armando el link de baja escapaba
      // de la función y dejaba el lote entero trabado en `sending`.
      try {
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
        logger.error("blaster.batch_failed", { campaignId, n: group.length, msg });
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
 *
 * Se detiene si la campaña se pausó: `processCampaignBatch` sólo levanta
 * `queued`, y pausar mueve los pendientes fuera de ese estado.
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
