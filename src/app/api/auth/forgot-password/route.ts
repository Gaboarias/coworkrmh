import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC = {
  message:
    "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.",
};

function baseUrl(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(GENERIC);
    }

    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
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

    const resetUrl = `${baseUrl(req)}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error("forgot-password error:", err);
    // Still generic to the client; never leak internals.
    return NextResponse.json(GENERIC);
  }
}
