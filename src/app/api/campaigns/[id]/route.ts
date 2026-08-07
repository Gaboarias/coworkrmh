import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";
import { processCampaignQueue } from "@/lib/marketing/processCampaign";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

/**
 * PATCH /api/campaigns/[id]  (admin)
 * body: { action: "pause" | "resume" | "cancel" }
 *
 * Hasta ahora, apretar "Enviar" era irreversible: los estados `paused` y
 * `failed` existían en el enum y no los seteaba nadie, y no había PATCH ni
 * DELETE. Con una campaña de miles de destinatarios drenándose por cron
 * durante horas, no tener botón de parar es el problema más caro de todos —
 * un asunto equivocado se sigue mandando mientras mirás.
 *
 * Cómo se para: los pendientes se sacan de `queued`. `processCampaignBatch`
 * sólo levanta `queued`, así que en cuanto termina el lote en vuelo no sale
 * nada más. Lo ya enviado no se puede deshacer y no se toca.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  if (!["pause", "resume", "cancel"].includes(action)) {
    return NextResponse.json(
      { error: "Acción inválida: pause | resume | cancel" },
      { status: 400 }
    );
  }

  const [c] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, params.id));
  if (!c) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  if (action === "pause") {
    if (c.status !== "sending") {
      return NextResponse.json(
        { error: "Sólo se puede pausar una campaña en envío" },
        { status: 409 }
      );
    }
    // `paused` en los sends también, para que el reaper no los confunda con
    // envíos abandonados y los reencole. Los que están en `sending` ahora
    // mismo se dejan: ese lote ya salió hacia Resend.
    const r = await db.execute(sql`
      UPDATE campaign_sends SET status = 'paused', updated_at = now()
      WHERE campaign_id = ${c.id} AND status = 'queued'
      RETURNING id
    `);
    await db
      .update(campaigns)
      .set({ status: "paused" })
      .where(eq(campaigns.id, c.id));
    logger.warn("blaster.paused", { campaignId: c.id, held: r.rows.length });
    return NextResponse.json({ status: "paused", held: r.rows.length });
  }

  if (action === "resume") {
    if (c.status !== "paused") {
      return NextResponse.json(
        { error: "Sólo se puede reanudar una campaña pausada" },
        { status: 409 }
      );
    }
    const r = await db.execute(sql`
      UPDATE campaign_sends SET status = 'queued', updated_at = now()
      WHERE campaign_id = ${c.id} AND status = 'paused'
      RETURNING id
    `);
    await db
      .update(campaigns)
      .set({ status: "sending" })
      .where(eq(campaigns.id, c.id));

    // Drenar ya, igual que en el launch: reanudar y que no pase nada durante
    // 10 minutos se lee como que el botón no funcionó.
    let processed = 0;
    let sendError: string | null = null;
    try {
      processed = await processCampaignQueue();
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
    }
    return NextResponse.json({
      status: "sending",
      requeued: r.rows.length,
      processed,
      sendError,
    });
  }

  // cancel
  if (c.status === "sent") {
    return NextResponse.json(
      { error: "La campaña ya terminó de enviarse" },
      { status: 409 }
    );
  }
  const r = await db.execute(sql`
    UPDATE campaign_sends
    SET status = 'failed',
        error = 'Campaña cancelada antes de enviar',
        updated_at = now()
    WHERE campaign_id = ${c.id} AND status IN ('queued','paused')
    RETURNING id
  `);
  await db
    .update(campaigns)
    .set({ status: "failed" })
    .where(eq(campaigns.id, c.id));
  logger.warn("blaster.cancelled", {
    campaignId: c.id,
    cancelled: r.rows.length,
  });
  return NextResponse.json({ status: "failed", cancelled: r.rows.length });
}

/**
 * DELETE /api/campaigns/[id]  (admin)
 *
 * Sólo borradores. Una campaña que ya salió es registro de algo que le pasó a
 * personas reales: sus métricas, sus rebotes y sus bajas tienen que sobrevivir
 * a que alguien quiera "limpiar la lista".
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const [c] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(eq(campaigns.id, params.id));
  if (!c) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  if (c.status !== "draft") {
    return NextResponse.json(
      { error: "Sólo se pueden borrar borradores" },
      { status: 409 }
    );
  }

  // Defensa en profundidad: un borrador no debería tener envíos, pero si los
  // tuviera, borrar la campaña se los llevaría en cascada sin que nadie mire.
  const [{ n }] = (
    await db.execute(sql`
      SELECT count(*)::int AS n FROM campaign_sends WHERE campaign_id = ${c.id}
    `)
  ).rows as Array<{ n: number }>;
  if (n > 0) {
    return NextResponse.json(
      { error: "Este borrador tiene envíos registrados; no se puede borrar" },
      { status: 409 }
    );
  }

  await db.delete(campaigns).where(eq(campaigns.id, c.id));
  return NextResponse.json({ ok: true });
}
