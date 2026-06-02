import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { resetPasswordBodySchema, parseBody } from "@/lib/validation/auth";
import { revokeAllRefreshTokensForUser } from "@/lib/auth-bearer";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, resetPasswordBodySchema);
    if (!parsed.ok) return parsed.response;
    const { token, password } = parsed.data;

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      // Clean up an expired token if it exists.
      if (row) {
        await db
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.id, row.id));
      }
      return NextResponse.json(
        { error: "El enlace expiró o no es válido. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    // Single use: invalidate all reset tokens for this user.
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, row.userId));

    // Password cambió → cortar todas las sesiones mobile activas.
    await revokeAllRefreshTokensForUser(row.userId);

    return NextResponse.json({ ok: true });
  } catch {
    // No loguear stack — puede contener PII (token + password en el body).
    return NextResponse.json(
      { error: "Error interno. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
