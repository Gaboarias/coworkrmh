/**
 * GET /api/users/[userId]/workspaces — lista los workspaceIds del user.
 * POST /api/users/[userId]/workspaces — admin reemplaza el set de
 *   workspaces del user. Body: { workspaceIds: string[] }
 *
 * Idempotente: hace diff. Agrega los nuevos, REMUEVE los que ya no están
 * en la lista (excepto donde el user es owner — el owner no se puede
 * remover por esta vía, hay que transferir ownership primero).
 *
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { and, eq, ne, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { setUserWorkspacesBodySchema, parseBody } from "@/lib/validation/auth";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rows = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, params.userId));

  return NextResponse.json({ workspaces: rows });
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = await parseBody(request, setUserWorkspacesBodySchema);
  if (!parsed.ok) return parsed.response;
  const desiredIds = parsed.data.workspaceIds;

  // Verificar que el user existe.
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Levantar memberships actuales.
  const current = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, params.userId));

  const currentIds = new Set(current.map((m) => m.workspaceId));
  const desiredSet = new Set(desiredIds);

  // Diff: agregar los desired que NO están en current.
  const toAdd = desiredIds.filter((id) => !currentIds.has(id));
  // Remover los current que ya NO están en desired — pero NO al owner.
  const toRemove = current
    .filter((m) => !desiredSet.has(m.workspaceId) && m.role !== "owner")
    .map((m) => m.workspaceId);

  if (toAdd.length > 0) {
    await db
      .insert(workspaceMembers)
      .values(
        toAdd.map((wsId) => ({
          workspaceId: wsId,
          userId: params.userId,
          role: "member" as const,
        }))
      )
      .onConflictDoNothing({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      });
  }

  if (toRemove.length > 0) {
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, params.userId),
          inArray(workspaceMembers.workspaceId, toRemove),
          ne(workspaceMembers.role, "owner")
        )
      );
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    await logAdminAction({
      actorId: session.user.id,
      entityType: "workspace_membership",
      entityId: params.userId,
      action: "updated",
      description: `Admin actualizó workspaces de user ${params.userId}: +${toAdd.length} / -${toRemove.length}`,
      oldValue: { workspaceIds: Array.from(currentIds) },
      newValue: { added: toAdd, removed: toRemove },
    });
  }

  return NextResponse.json({
    ok: true,
    added: toAdd.length,
    removed: toRemove.length,
    skippedOwners: current.length - currentIds.size + toRemove.length, // for audit
  });
}
