import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { changeMyPasswordBodySchema, parseBody } from "@/lib/validation/auth";
import { revokeAllRefreshTokensForUser } from "@/lib/auth-bearer";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = await parseBody(request, changeMyPasswordBodySchema);
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Usuario no válido" }, { status: 400 });
  }

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  // Bcrypt cost 12 — consistente con signup + admin password set.
  const newHash = await hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  // Revocar todas las sesiones mobile activas — si cambió su password,
  // todos sus refresh tokens viejos quedan revocados. Su device actual
  // seguirá funcionando con su access token vigente hasta que expire (24h),
  // pero no podrá refrescar sin re-loguearse.
  await revokeAllRefreshTokensForUser(session.user.id);

  return NextResponse.json({ ok: true });
}
