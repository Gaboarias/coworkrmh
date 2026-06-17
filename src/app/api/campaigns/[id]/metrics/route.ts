import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";

/**
 * GET /api/campaigns/[id]/metrics  (admin)
 * Aperturas/clics son ÚNICOS por destinatario (distinct send_id).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const id = params.id;

  const sendsRes = await db.execute(sql`
    SELECT
      count(*)::int                                                            AS total,
      count(*) FILTER (WHERE status IN ('sent','delivered','opened','clicked'))::int AS sent,
      count(*) FILTER (WHERE status = 'delivered')::int                        AS delivered,
      count(*) FILTER (WHERE status = 'bounced')::int                          AS bounced,
      count(*) FILTER (WHERE status = 'complained')::int                       AS complained,
      count(*) FILTER (WHERE status = 'failed')::int                           AS failed,
      count(*) FILTER (WHERE status = 'queued')::int                           AS queued
    FROM campaign_sends WHERE campaign_id = ${id}
  `);

  const evtRes = await db.execute(sql`
    SELECT
      count(DISTINCT send_id) FILTER (WHERE type = 'opened')::int  AS unique_opens,
      count(DISTINCT send_id) FILTER (WHERE type = 'clicked')::int AS unique_clicks
    FROM email_events WHERE campaign_id = ${id}
  `);

  const s = sendsRes.rows[0] as Record<string, number>;
  const e = evtRes.rows[0] as Record<string, number>;
  const denom = s.delivered || s.sent || 1;

  return NextResponse.json({
    ...s,
    uniqueOpens: e.unique_opens,
    uniqueClicks: e.unique_clicks,
    openRate: +((e.unique_opens / denom) * 100).toFixed(1),
    clickRate: +((e.unique_clicks / denom) * 100).toFixed(1),
    bounceRate: +((s.bounced / (s.sent || 1)) * 100).toFixed(1),
  });
}
