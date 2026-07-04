import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { setUserRoleBodySchema, parseBody } from "@/lib/validation/auth";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = await parseBody(request, setUserRoleBodySchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  const [target] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // No permitir auto-degradarse ni dejar el sistema sin ningún admin (lockout).
  if (role !== "admin" && target.role === "admin") {
    if (target.id === session.user.id) {
      return NextResponse.json(
        { error: "No podés quitarte tu propio rol de administrador." },
        { status: 400 }
      );
    }
    const [{ count: adminCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "admin"));
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Debe quedar al menos un administrador en el sistema." },
        { status: 400 }
      );
    }
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, params.userId));

  await logAdminAction({
    actorId: session.user.id,
    entityType: "user",
    entityId: params.userId,
    action: "updated",
    description: `Admin cambió rol de ${target.email ?? params.userId}: ${target.role} → ${role}`,
    oldValue: { role: target.role },
    newValue: { role },
  });

  return NextResponse.json({ ok: true });
}
