import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix"; // Resend firma webhooks con Svix
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignSends, emailEvents, suppressions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type EventType = (typeof emailEvents.type.enumValues)[number];

const TYPE_MAP: Record<string, EventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET no configurado" },
      { status: 500 }
    );
  }

  const raw = await req.text();

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
    evt = wh.verify(raw, {
      "svix-id": req.headers.get("svix-id")!,
      "svix-timestamp": req.headers.get("svix-timestamp")!,
      "svix-signature": req.headers.get("svix-signature")!,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const type = TYPE_MAP[evt.type];
  if (!type) return NextResponse.json({ ok: true }); // evento que no nos importa

  const data = evt.data as { email_id?: string; to?: string | string[] };
  const messageId = data.email_id;
  const to = data.to;
  const email: string | undefined = Array.isArray(to) ? to[0] : to;

  // localizar el send por el id de Resend
  const [send] = messageId
    ? await db
        .select()
        .from(campaignSends)
        .where(eq(campaignSends.providerMessageId, messageId))
    : [];

  // Sólo registramos eventos que mapean a un send nuestro O que tienen email.
  // Si no hay send asociado, igual guardamos el evento (campaignId null) para
  // no perder señal, pero NO ensucia el estado de campañas ajenas.
  await db.insert(emailEvents).values({
    sendId: send?.id ?? null,
    campaignId: send?.campaignId ?? null,
    type,
    email: email ?? null,
    metadata: evt.data,
  });

  if (send) {
    if (type === "delivered")
      await db
        .update(campaignSends)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(campaignSends.id, send.id));
    if (type === "bounced")
      await db
        .update(campaignSends)
        .set({ status: "bounced", updatedAt: new Date() })
        .where(eq(campaignSends.id, send.id));
    if (type === "complained")
      await db
        .update(campaignSends)
        .set({ status: "complained", updatedAt: new Date() })
        .where(eq(campaignSends.id, send.id));

    // auto-suppress: nunca volver a mandarle a un hard bounce o una queja.
    // NOTA: trata TODO email.bounced como hard bounce. Si querés permitir
    // soft-bounces (reintentos), revisar evt.data.bounce.type antes de suprimir.
    if ((type === "bounced" || type === "complained") && email) {
      await db
        .insert(suppressions)
        .values({
          bucketId: send.bucketId,
          email: email.toLowerCase(),
          reason: type === "bounced" ? "hard_bounce" : "complaint",
        })
        .onConflictDoNothing();
    }
  }

  return NextResponse.json({ ok: true });
}
