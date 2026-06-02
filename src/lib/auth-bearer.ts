/**
 * Mobile bearer token helpers — firma y verifica JWTs para autenticación
 * desde la app RN (que no puede manejar cookies HTTP-only de NextAuth).
 *
 * Usa el MISMO NEXTAUTH_SECRET que NextAuth para compartir el universo de
 * firma — facilita migrar a un solo verifier unificado en el futuro.
 *
 * Algoritmo: HS256 (HMAC SHA-256, simétrico — server-only secret).
 *
 * Modelo de tokens (S-09 del tech-debt-audit):
 *  - Access token: JWT firmado, TTL 24h. Self-contained, no DB lookup.
 *  - Refresh token: random 256-bit, hash en DB. TTL 30 días. Single-use
 *    (rotación al refrescar). Revocable por logout / password change.
 *
 * Flow mobile:
 *  1. login → recibe { token, refreshToken }
 *  2. usa Bearer <token> hasta 401
 *  3. al 401 → POST /api/auth/refresh con { refreshToken } → { token,
 *     refreshToken } nuevos (refresh viejo queda revocado)
 *  4. logout → POST /api/auth/logout con { refreshToken } → revoke
 */

import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema";

const ALG = "HS256";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h (access token corto)
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

interface MobileTokenPayload {
  sub: string;       // userId
  email: string;
  name: string | null;
  role: string;
  image: string | null;
}

interface DecodedMobileToken extends MobileTokenPayload {
  iat: number;
  exp: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET no configurado");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Firma un JWT mobile para el usuario indicado.
 * Lifetime configurable via segundo arg (default 30 días).
 */
export async function signMobileToken(
  payload: MobileTokenPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setSubject(payload.sub)
    .sign(getSecretKey());
  return jwt;
}

/**
 * Verifica un Bearer token de un Authorization header.
 * Retorna el payload decoded si válido, null si no.
 *
 * Acepta el header completo `Bearer <jwt>` o sólo el JWT raw.
 */
export async function verifyBearerToken(
  authHeader: string | null | undefined
): Promise<DecodedMobileToken | null> {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [ALG],
    });
    return payload as unknown as DecodedMobileToken;
  } catch {
    // Token inválido, expirado, firmado con otro secret → null.
    return null;
  }
}

// ─── Refresh tokens ──────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Emite un refresh token nuevo para el user dado. Guarda el hash en DB
 * y devuelve el token raw para devolver al cliente (NUNCA se vuelve a leer
 * del raw — solo el hash queda persistido).
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex"); // 64 chars hex = 256 bits
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
  return raw;
}

/**
 * Valida un refresh token y lo rota:
 *  - Si válido (existe, no expirado, no revocado): revoca el viejo, emite
 *    uno nuevo, devuelve { userId, newRefreshToken }.
 *  - Si inválido / expirado / revocado: devuelve null.
 *
 * Rotación previene reuse: si un atacante roba un refresh y lo usa, el
 * legítimo recibe `null` la próxima vez (porque el ladrón lo consumió)
 * y debe re-loguearse — señal de compromiso.
 */
export async function verifyAndRotateRefreshToken(
  raw: string | null | undefined
): Promise<{ userId: string; newRefreshToken: string } | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const now = new Date();

  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .limit(1);
  if (!row) return null;

  // Revocar el viejo (single-use rotation).
  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(eq(refreshTokens.id, row.id));

  const newRefreshToken = await issueRefreshToken(row.userId);
  return { userId: row.userId, newRefreshToken };
}

/** Revoca un refresh token (logout). Idempotente. */
export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

/** Revoca todos los refresh tokens activos de un user (password change). */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    );
}
