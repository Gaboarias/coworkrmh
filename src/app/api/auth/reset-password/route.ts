import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      { error: "Error interno. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
