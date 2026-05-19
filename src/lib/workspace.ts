import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

export const WS_COOKIE = "ws";

export interface Workspace {
  id: string;
  name: string;
  color: string;
}

/** Entornos a los que pertenece el usuario actual (admin → todos). */
export const getMemberWorkspaces = async (): Promise<{
  userId: string;
  isAdmin: boolean;
  workspaces: Workspace[];
}> => {
  const session = await auth();
  if (!session?.user) return { userId: "", isAdmin: false, workspaces: [] };

  const userId = session.user.id;
  const isAdmin = ((session.user.role as string) ?? "member") === "admin";

  if (isAdmin) {
    const rows = await db
      .select({ id: workspaces.id, name: workspaces.name, color: workspaces.color })
      .from(workspaces)
      .orderBy(asc(workspaces.name));
    return { userId, isAdmin, workspaces: rows };
  }

  const memberRows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  const ids = memberRows.map((m) => m.workspaceId);
  if (ids.length === 0) return { userId, isAdmin, workspaces: [] };

  const rows = await db
    .select({ id: workspaces.id, name: workspaces.name, color: workspaces.color })
    .from(workspaces)
    .where(inArray(workspaces.id, ids))
    .orderBy(asc(workspaces.name));
  return { userId, isAdmin, workspaces: rows };
};

/**
 * Entorno activo: cookie `ws` validada contra la membresía; si no hay/no
 * válida, cae al primero. `null` si el usuario no pertenece a ninguno.
 */
export const getActiveWorkspace = async (): Promise<Workspace | null> => {
  const { workspaces: list } = await getMemberWorkspaces();
  if (list.length === 0) return null;
  const cookieId = cookies().get(WS_COOKIE)?.value;
  return list.find((w) => w.id === cookieId) ?? list[0];
};

/** True si el usuario actual puede acceder a un entorno concreto. */
export const canAccessWorkspace = async (
  workspaceId: string
): Promise<boolean> => {
  const { workspaces: list } = await getMemberWorkspaces();
  return list.some((w) => w.id === workspaceId);
};

/**
 * Guard para páginas de un recurso (proyecto) con deep-link auto-switch:
 * - sin acceso al entorno del recurso → notFound()
 * - con acceso pero entorno activo distinto → cambia (redirect a /api/ws/switch)
 * - en el entorno correcto → continúa
 */
export const ensureWorkspaceForResource = async (
  resourceWorkspaceId: string,
  nextPath: string
): Promise<void> => {
  if (!(await canAccessWorkspace(resourceWorkspaceId))) {
    notFound();
  }
  const cookieId = cookies().get(WS_COOKIE)?.value;
  if (cookieId !== resourceWorkspaceId) {
    redirect(
      `/api/ws/switch?to=${resourceWorkspaceId}&next=${encodeURIComponent(
        nextPath
      )}`
    );
  }
};
