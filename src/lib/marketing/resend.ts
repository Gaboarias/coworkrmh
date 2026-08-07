/**
 * Cliente Resend para MARKETING (Email Blaster) + helpers de plantilla y baja.
 *
 * Aislado del transaccional (src/lib/email.ts) a propósito: key, cuota y sobre
 * todo REPUTACIÓN separadas. Las campañas salen de `mkt.rwndmedia.com`; el
 * transaccional, del dominio raíz. Un rebote masivo de una campaña no puede
 * arrastrarse a los correos de reset de contraseña.
 */

import { Resend } from "resend";
import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/email";

/** True en el deployment de producción (VERCEL_ENV distingue prod de preview). */
const isProd = () => process.env.VERCEL_ENV === "production";

export function getMarketingResend(): Resend {
  // Fuera de producción se acepta la key transaccional, para que un dev pueda
  // probar sin dar de alta un segundo dominio. En producción NO: ese `??` es
  // silencioso, y olvidarse de la key de marketing significaría mandar miles
  // de correos con la key del dominio que manda los resets — justo lo que este
  // módulo existe para evitar.
  const key = isProd()
    ? process.env.RESEND_MARKETING_API_KEY
    : process.env.RESEND_MARKETING_API_KEY ?? process.env.RESEND_API_KEY;

  if (!key) {
    throw new Error(
      isProd()
        ? "RESEND_MARKETING_API_KEY no está configurada. En producción no se " +
          "usa la key transaccional como respaldo: quemaría la reputación del " +
          "dominio que manda los resets de contraseña."
        : "RESEND_MARKETING_API_KEY (o RESEND_API_KEY) no está configurada"
    );
  }
  return new Resend(key);
}

/**
 * Todo lo que un envío necesita, verificado ANTES de tocar la cola.
 *
 * Existe por el orden de operaciones de `processCampaignBatch`: primero
 * reclamaba el lote marcándolo `sending` (y commiteaba), y recién después
 * pedía el cliente de Resend y armaba los links de baja. Si faltaba una
 * variable, la excepción escapaba con hasta 100 filas ya en `sending` — que
 * ningún cron vuelve a levantar, porque el cron sólo mira `queued`. La
 * campaña quedaba "Enviando" para siempre y esas 100 personas no recibían
 * nada, sin ningún error visible.
 *
 * Chequear antes convierte eso en un fallo limpio: la cola no se toca.
 */
export function assertMarketingConfigured(): void {
  const faltan: string[] = [];

  const tieneKey = isProd()
    ? !!process.env.RESEND_MARKETING_API_KEY
    : !!(process.env.RESEND_MARKETING_API_KEY ?? process.env.RESEND_API_KEY);
  if (!tieneKey) faltan.push("RESEND_MARKETING_API_KEY");

  if (!process.env.UNSUB_SECRET) faltan.push("UNSUB_SECRET");

  // getAppUrl tira en producción si falta APP_URL. Sin ella el link de baja
  // sería inválido, y un `List-Unsubscribe` roto se paga con reportes de spam.
  try {
    getAppUrl();
  } catch {
    faltan.push("APP_URL");
  }

  if (faltan.length) {
    throw new Error(
      `El blaster no está configurado: falta ${faltan.join(", ")}.`
    );
  }
}

/**
 * Escapa lo que se interpola en el HTML del correo.
 *
 * Los valores de merge salen del CRM, o sea que los escribió una persona. Un
 * `company_name` con un `<a href>` adentro se convertiría en un link real
 * dentro de un correo firmado con nuestro dominio. El transaccional ya escapa
 * (`esc()` en src/lib/email.ts); esto cierra la misma puerta acá.
 */
function esc(raw: unknown): string {
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Reemplaza {{tag}} por su valor escapado. Lo que no exista queda vacío. */
export function renderTemplate(
  html: string,
  data: Record<string, unknown> = {}
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v === undefined || v === null ? "" : esc(v);
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
