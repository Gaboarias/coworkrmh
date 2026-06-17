/**
 * Cliente Resend para MARKETING (Email Blaster) + helpers de plantilla y baja.
 *
 * Aislado del transaccional (src/lib/email.ts) a propósito:
 *  - Usa RESEND_MARKETING_API_KEY (key/cuota/reputación separadas).
 *  - Si esa key no está seteada todavía (pre-DNS del subdominio), cae a
 *    RESEND_API_KEY para no romper dev — pero en prod conviene la separada
 *    (ver PLAN.md Fase 4: protege la entregabilidad del transaccional).
 */

import { Resend } from "resend";
import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/email";

export function getMarketingResend(): Resend {
  const key =
    process.env.RESEND_MARKETING_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_MARKETING_API_KEY (o RESEND_API_KEY) no está configurada"
    );
  }
  return new Resend(key);
}

/** Reemplaza {{tag}} por su valor. Lo que no exista queda vacío. */
export function renderTemplate(
  html: string,
  data: Record<string, unknown> = {}
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Token HMAC stateless para el link de baja. No requiere guardar nada extra. */
export function unsubToken(email: string, bucketId: string): string {
  const secret = process.env.UNSUB_SECRET;
  if (!secret) throw new Error("UNSUB_SECRET no está configurada");
  return createHmac("sha256", secret)
    .update(`${bucketId}:${email.toLowerCase()}`)
    .digest("hex");
}

export function verifyUnsubToken(
  email: string,
  bucketId: string,
  token: string
): boolean {
  try {
    const expected = unsubToken(email, bucketId);
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** URL absoluta del link de baja (usa el getAppUrl compartido). */
export function unsubUrl(email: string, bucketId: string): string {
  const u = new URL("/api/unsubscribe", getAppUrl());
  u.searchParams.set("email", email);
  u.searchParams.set("bucket", bucketId);
  u.searchParams.set("t", unsubToken(email, bucketId));
  return u.toString();
}
