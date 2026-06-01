/**
 * Mobile bearer token helpers — firma y verifica JWTs para autenticación
 * desde la app RN (que no puede manejar cookies HTTP-only de NextAuth).
 *
 * Usa el MISMO NEXTAUTH_SECRET que NextAuth para compartir el universo de
 * firma — facilita migrar a un solo verifier unificado en el futuro.
 *
 * Algoritmo: HS256 (HMAC SHA-256, simétrico — server-only secret).
 * Lifetime: 30 días por default — móvil rara vez relogeas, mantener
 * sesión larga es la expectativa de UX nativo.
 */

import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

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
