/**
 * POST /api/auth/logout — revoca un refresh token (logout mobile).
 *
 * Body: { refreshToken: string }
 * Response 200: { ok: true }   (siempre, incluso si el token no existía
 *                              o ya estaba revocado — idempotente)
 *
 * El access token JWT NO se puede revocar (es self-contained y vive
 * hasta que expira, 24h máx). Lo que sí cortamos es la capacidad de
 * obtener nuevos access tokens via refresh. Una vez expirado el access
 * activo, el atacante no puede continuar.
 *
 * Auth: no requiere bearer — basta saber el refreshToken para revocarlo
 * (es el patrón estándar de OAuth refresh_token revocation).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/lib/auth-bearer";
import { parseBody } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

const logoutBodySchema = z.object({
  refreshToken: z.string().min(32).max(256),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, logoutBodySchema);
  if (!parsed.ok) return parsed.response;

  await revokeRefreshToken(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
