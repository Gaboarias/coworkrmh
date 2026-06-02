/**
 * POST /api/auth/mobile-token — login para mobile app.
 *
 * Body: { email: string, password: string }
 * Response 200: { token, refreshToken, user: { id, email, name, role, image } }
 * Response 400: { error: "..." } (validación Zod)
 * Response 401: { error: "Credenciales inválidas" }
 * Response 429: { error: "Demasiados intentos..." } (rate-limited)
 *
 * Tokens:
 *  - token (access): JWT firmado, TTL 24h. Bearer Authorization en cada API call.
 *  - refreshToken: random 256-bit, hash en DB. TTL 30d, single-use rotation.
 *    Usar en POST /api/auth/refresh cuando el access devuelva 401.
 *
 * Valida con bcrypt contra users.passwordHash, mismo flujo que el
 * CredentialsProvider de NextAuth (src/lib/auth.ts).
 *
 * Rate limit: 5 fallos por 15min por email — previene brute force.
 */

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken, issueRefreshToken } from "@/lib/auth-bearer";
import { loginBodySchema, parseBody } from "@/lib/validation/auth";
import {
  checkRateLimit,
  registerFailure,
  clearRateLimit,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginBodySchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  const rlKey = `mobile-token:${email}`;
  const guard = await checkRateLimit(rlKey);
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.message ?? "Demasiados intentos" },
      {
        status: 429,
        headers: guard.retryAfterSeconds
          ? { "Retry-After": String(guard.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.passwordHash) {
    await registerFailure(rlKey);
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    await registerFailure(rlKey);
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  await clearRateLimit(rlKey);

  const token = await signMobileToken({
    sub: user.id,
    email: user.email ?? "",
    name: user.name ?? null,
    role: user.role ?? "member",
    image: user.avatarUrl ?? null,
  });
  const refreshToken = await issueRefreshToken(user.id);

  return NextResponse.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.avatarUrl,
    },
  });
}
