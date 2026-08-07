import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";
import {
  assertMarketingConfigured,
  getMarketingResend,
  renderTemplate,
  unsubUrl,
} from "@/lib/marketing/resend";

export const maxDuration = 30;

/**
 * POST /api/campaigns/[id]/test-send  (admin)
 * body: { email?: string }  — por defecto, el correo de quien lo pide.
 *
 * Manda UNA copia de la campaña a una sola dirección, sin tocar la cola ni
 * `campaign_sends`, sin cambiar el estado de la campaña y sin registrar
 * métricas.
 *
 * Por qué hace falta: hasta ahora la única forma de ver cómo se veía una
 * campaña era apretar "Enviar" y que saliera a N clientes reales. Un asunto
 * mal escrito, un merge tag que no resuelve o una imagen rota se descubrían
 * después, y no hay forma de deshacer un envío masivo. La propia QA marcaba
 * ese botón como zona prohibida justamente porque no había alternativa.
 *
 * El destinatario NO se filtra por supresiones a propósito: es tu propia
 * casilla y estás pidiendo verlo vos. Tampoco se registra en `campaign_sends`,
 * así que no ensucia las métricas de la campaña.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  try {
    assertMarketingConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blaster no configurado" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const to =
    typeof body.email === "string" && body.email.includes("@")
      ? body.email.trim()
      : user.email;

  if (!to) {
    return NextResponse.json(
      { error: "No hay a qué dirección mandar la prueba" },
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

  // Datos de muestra para que los merge tags se vean resueltos. Con valores
  // vacíos, una plantilla rota parece correcta: "Hola ," se lee casi bien.
  const muestra = {
    nombre: "Nombre de prueba",
    empresa: "Empresa de prueba",
  };

  const unsub = unsubUrl(to, c.bucketId);
  const html =
    `<p style="background:#fff3cd;border:1px solid #ffe08a;padding:10px 14px;` +
    `font-family:sans-serif;font-size:13px;margin:0 0 20px">` +
    `<strong>Prueba</strong> — así se va a ver. Los datos son de muestra y ` +
    `esta copia no cuenta en las métricas.</p>` +
    renderTemplate(c.html, muestra) +
    `<p style="font-size:12px;color:#888;margin-top:24px">` +
    `<a href="${unsub}">Cancelar suscripción</a></p>`;

  try {
    const resend = getMarketingResend();
    const { error } = await resend.emails.send({
      from: `${c.fromName} <${c.fromEmail}>`,
      to,
      // El prefijo va en el asunto para que no se confunda con el envío real
      // en la bandeja, que es donde se van a ver los dos juntos.
      subject: `[PRUEBA] ${renderTemplate(c.subject, muestra)}`,
      html,
      replyTo: c.replyTo ?? undefined,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, to });
  } catch (err) {
    // El error de Resend se devuelve tal cual: acá es donde se descubre que el
    // dominio del `from` no está verificado, y ese mensaje es la pista.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
