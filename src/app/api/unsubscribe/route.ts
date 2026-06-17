import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppressions } from "@/lib/db/schema";
import { verifyUnsubToken } from "@/lib/marketing/resend";

/**
 * Baja de suscripción. Público (sin sesión) — se valida con token HMAC.
 *  - GET  → click humano desde el correo (devuelve HTML)
 *  - POST → one-click (header List-Unsubscribe-Post de Gmail/Apple Mail)
 */
async function suppress(
  email: string | null,
  bucket: string | null,
  token: string | null
): Promise<boolean> {
  if (!email || !bucket || !token) return false;
  if (!verifyUnsubToken(email, bucket, token)) return false;
  await db
    .insert(suppressions)
    .values({ bucketId: bucket, email: email.toLowerCase(), reason: "unsubscribe" })
    .onConflictDoNothing();
  return true;
}

function page(ok: boolean): string {
  const msg = ok
    ? "Te diste de baja correctamente. No recibirás más correos."
    : "Enlace inválido o expirado.";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Suscripción — Pistachio</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f2eb;margin:0;padding:48px 24px;color:#161412">
<div style="max-width:420px;margin:0 auto;text-align:center">
<div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#10231A;color:#C9E58B;font-weight:800;font-size:20px;margin-bottom:20px">P</div>
<p style="font-size:16px;line-height:1.5;color:#524d44">${msg}</p>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const ok = await suppress(sp.get("email"), sp.get("bucket"), sp.get("t"));
  return new NextResponse(page(ok), {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const ok = await suppress(sp.get("email"), sp.get("bucket"), sp.get("t"));
  return NextResponse.json({ ok });
}
