/**
 * Rate limiting basado en DB (sin Upstash, sin Redis, sin nuevas subs).
 *
 * Patrón: una fila por (key) en `rate_limits` con count + lockedUntil.
 *
 * Uso típico (auth):
 *   const guard = await checkRateLimit(`mobile-token:${email}`, {
 *     maxAttempts: 5,
 *     windowMinutes: 15,
 *   });
 *   if (!guard.allowed) {
 *     return NextResponse.json({ error: guard.message }, { status: 429 });
 *   }
 *   // ...validar credenciales...
 *   if (!valid) {
 *     await registerFailure(`mobile-token:${email}`, { maxAttempts: 5, windowMinutes: 15 });
 *     return 401;
 *   }
 *   await clearRateLimit(`mobile-token:${email}`); // login OK → reset
 *
 * Limpieza: filas con updatedAt antiguo se ignoran (el count se considera
 * stale en checkRateLimit si pasó la ventana). No hay cron de cleanup
 * todavía — se puede agregar si la tabla crece.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

interface RateLimitOpts {
  /** Cuántos intentos antes de lockear. Default 5. */
  maxAttempts?: number;
  /** Ventana en minutos. Si la fila es más vieja que esto, se resetea. Default 15. */
  windowMinutes?: number;
  /** Cuánto tiempo lockear cuando se cruza el threshold. Default = windowMinutes. */
  lockMinutes?: number;
}

interface CheckResult {
  allowed: boolean;
  /** Mensaje user-facing si está bloqueado. */
  message?: string;
  /** Segundos hasta que se desbloquee. */
  retryAfterSeconds?: number;
}

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW = 15;

/**
 * Verifica si el endpoint está bloqueado para esta key. NO incrementa el
 * counter — eso es responsabilidad de registerFailure() después de un fallo
 * real. Llamar al inicio del handler.
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOpts = {}
): Promise<CheckResult> {
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);
  if (!row) return { allowed: true };
  const now = Date.now();
  if (row.lockedUntil && row.lockedUntil.getTime() > now) {
    const retryAfterSeconds = Math.ceil((row.lockedUntil.getTime() - now) / 1000);
    return {
      allowed: false,
      message: `Demasiados intentos. Probá de nuevo en ${Math.ceil(retryAfterSeconds / 60)} min.`,
      retryAfterSeconds,
    };
  }
  return { allowed: true };
}

/**
 * Registra un fallo. Si supera el threshold, lockea la key hasta now+lockMinutes.
 */
export async function registerFailure(
  key: string,
  opts: RateLimitOpts = {}
): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX;
  const windowMinutes = opts.windowMinutes ?? DEFAULT_WINDOW;
  const lockMinutes = opts.lockMinutes ?? windowMinutes;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60_000);

  // Lee fila actual (si existe).
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  // Si la fila es vieja (antes de la ventana), se resetea a count=1.
  const stale = row && row.updatedAt < windowStart;
  const nextCount = !row || stale ? 1 : row.count + 1;
  const shouldLock = nextCount >= maxAttempts;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + lockMinutes * 60_000)
    : null;

  if (!row) {
    await db.insert(rateLimits).values({
      key,
      count: nextCount,
      lockedUntil,
      updatedAt: now,
    });
  } else {
    await db
      .update(rateLimits)
      .set({ count: nextCount, lockedUntil, updatedAt: now })
      .where(eq(rateLimits.key, key));
  }
}

/**
 * Limpia la key (login exitoso, signup OK, etc.). Hace DELETE.
 */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/**
 * Extrae la IP del request. Usa x-forwarded-for (Vercel siempre lo setea).
 * Fallback "unknown" — preferible a no rate-limitear.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
