import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

function baseUrl(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const ROLES = ["admin", "manager", "member"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { name, email, role } = await request.json();

  const normalized =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalized || !normalized.includes("@")) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  const safeRole = ROLES.includes(role) ? role : "member";

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 409 }
    );
  }

  const [user] = await db
    .insert(users)
    .values({
      email: normalized,
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      passwordHash: null,
      role: safeRole,
    })
    .returning({ id: users.id, email: users.email });

  // Invite token (reuses the password-reset flow as "set your password").
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const inviteUrl = `${baseUrl(request)}/reset-password?token=${rawToken}`;

  let emailSent = false;
  try {
    await sendPasswordResetEmail(user.email, inviteUrl);
    emailSent = true;
  } catch {
    // Resend no configurado u otro fallo: el admin comparte el link manualmente.
  }

  return NextResponse.json(
    { ok: true, user, inviteUrl, emailSent },
    { status: 201 }
  );
}
