import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail, getAppUrl } from "@/lib/email";
import { forgotPasswordBodySchema, parseBody } from "@/lib/validation/auth";

const GENERIC = {
  message:
    "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.",
};

/**
 * El link salía de un `baseUrl(req)` que leía `Origin` y, si no venía,
 * `X-Forwarded-Host`. Los tres headers los elige quien hace el request.
 *
 * O sea que un POST a este endpoint con el correo de una víctima y
 * `Origin: https://atacante.com` hacía que le llegara un correo REAL —salido
 * de nuestro dominio, firmado con nuestro DKIM, indistinguible de uno
 * legítimo— con el link de reset apuntando al atacante y un token válido
 * adentro. Toma de cuenta con un solo request y sin autenticarse.
 *
 * Ahora el origen del link es `getAppUrl()`, que sale de la configuración del
 * servidor y no de nada que mande el cliente.
 */

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, forgotPasswordBodySchema);
    // Si la forma es inválida devolvemos GENERIC también — no queremos
    // que un atacante distinga "email malformado" de "email no existe".
    if (!parsed.ok) return NextResponse.json(GENERIC);
    const { email } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return the same response — no user enumeration.
    if (!user) return NextResponse.json(GENERIC);

    // Throttle: skip if a token was issued in the last 60s.
    const [recent] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return NextResponse.json(GENERIC);
    }

    // Invalidate any existing tokens, then issue a fresh one.
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json(GENERIC);
  } catch {
    // No loguear stack — puede contener PII (email del request).
    return NextResponse.json(GENERIC);
  }
}
