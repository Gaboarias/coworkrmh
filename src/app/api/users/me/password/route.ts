import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Usuario no válido" }, { status: 400 });
  }

  const valid = await compare(currentPassword ?? "", user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  const newHash = await hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
