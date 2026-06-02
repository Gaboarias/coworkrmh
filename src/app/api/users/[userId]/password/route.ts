/**
 * POST /api/users/[userId]/password — admin asigna contraseña directa a un user.
 *
 * Body: { password: string }
 * Response 200: { ok: true }
 * Response 400: invalid password
 * Response 403: not admin
 * Response 404: user no existe
 *
 * Uso: cuando un user pierde acceso al email y el admin necesita setearle
 * una contraseña temporal que luego se la comunica out-of-band (WhatsApp,
 * llamada, en persona). El user entra y la cambia desde Settings.
 *
 * Side effects:
 *  - Invalida todos los reset tokens activos del user (single source of truth).
 *  - Setea passwordHash en users + updatedAt.
 *
 * Distinct de /api/users/me/password (user cambia su propia contraseña con
 * la actual + nueva — endpoint diferente, no requiere admin).
 */

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const password = body.password;
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  // Verificar que el user existe.
  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const passwordHash = await hash(password, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, params.userId));

  // Invalidar reset tokens activos del user — el admin acaba de setear
  // la contraseña, no tendría sentido que un token previo siga vivo.
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, params.userId));

  return NextResponse.json({ ok: true });
}
