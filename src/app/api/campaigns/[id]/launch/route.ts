import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, campaignSends } from "@/lib/db/schema";
import { resolveSegment, type SegmentFilter } from "@/lib/marketing/segment";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";
import { processCampaignQueue } from "@/lib/marketing/processCampaign";

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

  const recipients = body.segment
    ? await resolveSegment({
        ...(body.segment as SegmentFilter),
        bucketId: campaign.bucketId,
      })
    : body.recipients ?? [];

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

  // Trigger on-demand: procesa la cola ya, sin esperar al cron. Si algo falla
  // acá, el encolado ya quedó hecho y el cron de respaldo (cada 10 min) drena.
  let processed = 0;
  try {
    processed = await processCampaignQueue();
  } catch {
    /* el cron de respaldo lo procesará */
  }

  return NextResponse.json({ queued: rows.length, processed });
}
