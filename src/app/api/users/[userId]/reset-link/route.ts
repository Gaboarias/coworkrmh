/**
 * POST /api/users/[userId]/reset-link — admin genera un link de reset de
 * password para un user específico.
 *
 * Diferencia con /api/auth/forgot-password (público):
 *  - Este endpoint requiere admin role (no auto-iniciado por el user).
 *  - Devuelve el resetUrl al admin para copy/share manual (no solo email).
 *  - También envía el email automáticamente (best-effort, no falla si Resend
 *    no está configurado o el user no tiene email).
 *
 * Lifetime del token: 1 hora (mismo que forgot-password — single source).
 * Invalida tokens previos del user (idempotente, click el botón N veces y
 * sólo el último link funciona).
 *
 * Response 200: { ok: true, resetUrl: "https://...", emailSent: boolean }
 * Response 403: not admin
 * Response 404: user no existe
 */

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function baseUrl(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Invalidar tokens previos del user — idempotencia. Si el admin clickea
  // 2 veces, sólo el último link funciona.
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, target.id));

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: target.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${baseUrl(request)}/reset-password?token=${rawToken}`;

  // Best-effort email — no bloquear el response si falla.
  let emailSent = false;
  if (target.email) {
    try {
      await sendPasswordResetEmail(target.email, resetUrl);
      emailSent = true;
    } catch (err) {
      console.error("admin reset-link: email send failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    resetUrl,
    emailSent,
  });
}
