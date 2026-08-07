import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, campaignSends } from "@/lib/db/schema";
import { resolveSegment, type SegmentFilter } from "@/lib/marketing/segment";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";
import { processCampaignQueue } from "@/lib/marketing/processCampaign";
import { assertMarketingConfigured } from "@/lib/marketing/resend";
import { logger } from "@/lib/logger";

export const maxDuration = 60; // segundos — cubre el envío on-demand del lote

/**
 * POST /api/campaigns/[id]/launch  (admin)
 * body: { segment: SegmentFilter }   → resuelve la lista desde el CRM
 *   — o —
 * body: { recipients: Recipient[] }  → lista ya armada (override manual)
 *
 * resolveSegment ya excluye suppressions; acá sólo dedupe + insert + encola.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const body = await req.json().catch(() => ({}));

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, params.id));
  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  if (campaign.status === "sending" || campaign.status === "sent") {
    return NextResponse.json(
      { error: "La campaña ya fue lanzada" },
      { status: 409 }
    );
  }

  // El blaster tiene que estar configurado ANTES de encolar. Si no, se
  // insertaban N filas `queued` que después nadie podía procesar, y la
  // campaña quedaba "Enviando" sin que saliera un solo correo.
  try {
    assertMarketingConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blaster no configurado" },
      { status: 503 }
    );
  }

  /**
   * Los destinatarios SIEMPRE pasan por `resolveSegment`.
   *
   * La rama `body.recipients` aceptaba una lista cruda sin pasar por ahí, o
   * sea salteándose el filtro de supresiones por completo: se le podía mandar
   * a alguien que se había dado de baja. Ahora la lista manual sólo acota a
   * quiénes del segmento se le manda; las bajas se respetan igual.
   */
  const delSegmento = await resolveSegment({
    ...((body.segment ?? {}) as SegmentFilter),
    bucketId: campaign.bucketId,
  });

  let recipients = delSegmento;
  if (Array.isArray(body.recipients) && body.recipients.length) {
    const pedidos = new Set(
      (body.recipients as Array<{ email: string }>)
        .filter((r) => typeof r?.email === "string")
        .map((r) => r.email.toLowerCase())
    );
    recipients = delSegmento.filter((r) => pedidos.has(r.email.toLowerCase()));
  }

  // dedupe por email
  const seen = new Set<string>();
  const rows = recipients
    .filter((r: { email: string }) => {
      const e = r.email.toLowerCase();
      if (seen.has(e)) return false;
      seen.add(e);
      return true;
    })
    .map(
      (r: { contactId?: string; email: string; mergeData?: unknown }) => ({
        campaignId: campaign.id,
        bucketId: campaign.bucketId,
        contactId: r.contactId ?? null,
        email: r.email,
        mergeData: (r.mergeData ?? {}) as object,
        status: "queued" as const,
      })
    );

  if (rows.length) await db.insert(campaignSends).values(rows);

  await db
    .update(campaigns)
    .set({
      status: "sending",
      segmentQuery: (body.segment ?? campaign.segmentQuery) as object | null,
    })
    .where(eq(campaigns.id, campaign.id));

  // Trigger on-demand: procesa la cola ya, sin esperar al cron.
  //
  // El catch estaba vacío "porque el cron de respaldo lo procesará". Dos
  // problemas: si falta CRON_SECRET ese cron es un no-op que devuelve 200, así
  // que la promesa no se cumplía; y la UI decía "N correos encolados" aunque
  // no hubiera salido ninguno. Ahora el error viaja al cliente — encolado y
  // enviado son dos cosas distintas y la pantalla tiene que poder decirlo.
  let processed = 0;
  let sendError: string | null = null;
  try {
    processed = await processCampaignQueue();
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
    logger.error("blaster.launch_process_failed", {
      campaignId: campaign.id,
      queued: rows.length,
      msg: sendError,
    });
  }

  return NextResponse.json({
    queued: rows.length,
    processed,
    // null = todo bien. Con valor, la campaña quedó encolada pero el envío
    // falló: el cron reintentará, y mientras tanto quien lanzó se entera.
    sendError,
  });
}
