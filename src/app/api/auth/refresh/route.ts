/**
 * POST /api/auth/refresh — rota refresh token, emite nuevo access token.
 *
 * Body: { refreshToken: string }
 * Response 200: { token, refreshToken, user }
 * Response 401: { error: "Refresh token inválido o expirado" }
 *
 * Flow mobile:
 *  1. Bearer access token devuelve 401 (expirado).
 *  2. Cliente POSTea acá con el refreshToken guardado en SecureStore.
 *  3. Recibe { token, refreshToken } nuevos. Guarda ambos. Re-intenta
 *     el request original.
 *  4. Si esta llamada devuelve 401 → cliente cierra sesión.
 *
 * Rotación single-use: el refresh recibido queda revocado, devolvemos
 * uno nuevo. Si un atacante intentara reusar el viejo (race condition
 * + token robado), recibe 401 — señal de compromiso.
 *
 * Rate limit: 10 fallos / 15min por refreshToken (no por IP — un IP
 * legítimo con session expirada puede generar varios refresh válidos).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  signMobileToken,
  verifyAndRotateRefreshToken,
} from "@/lib/auth-bearer";
import { parseBody } from "@/lib/validation/auth";
import { checkRateLimit, registerFailure, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const refreshBodySchema = z.object({
  refreshToken: z.string().min(32).max(256),
});

export async function POST(request: Request) {
  // Rate limit: 30 req/min por IP — previene DoS. El token ya es single-use
  // (rotación), así que el riesgo principal es flooding, no brute-force.
  const ip = clientIp(request);
  const rlKey = `refresh:${ip}`;
  const guard = await checkRateLimit(rlKey, { maxAttempts: 30, windowMinutes: 1, lockMinutes: 5 });
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.message ?? "Demasiadas solicitudes" },
      { status: 429 }
    );
  }

  const parsed = await parseBody(request, refreshBodySchema);
  if (!parsed.ok) return parsed.response;
  const { refreshToken } = parsed.data;

  const rotated = await verifyAndRotateRefreshToken(refreshToken);
  if (!rotated) {
    await registerFailure(rlKey, { maxAttempts: 30, windowMinutes: 1, lockMinutes: 5 });
    return NextResponse.json(
      { error: "Refresh token inválido o expirado" },
      { status: 401 }
    );
  }

  // Cargar el user para incluir el snapshot actual en el access token.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, rotated.userId))
    .limit(1);
  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 401 }
    );
  }

  const token = await signMobileToken({
    sub: user.id,
    email: user.email ?? "",
    name: user.name ?? null,
    role: user.role ?? "member",
    image: user.avatarUrl ?? null,
  });

  return NextResponse.json({
    token,
    refreshToken: rotated.newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.avatarUrl,
    },
  });
}
