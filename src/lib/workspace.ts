import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export const WS_COOKIE = "ws";

export type WorkspaceRole = "owner" | "admin" | "member";

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
 * Rol del usuario actual en un entorno. El admin global se trata como `owner`
 * (bypass total). `null` si no es miembro.
 */
export const getWorkspaceRole = async (
  workspaceId: string
): Promise<{
  userId: string;
  isGlobalAdmin: boolean;
  role: WorkspaceRole | null;
}> => {
  const session = await auth();
  if (!session?.user) {
    return { userId: "", isGlobalAdmin: false, role: null };
  }
  const userId = session.user.id;
  const isGlobalAdmin =
    ((session.user.role as string) ?? "member") === "admin";
  if (isGlobalAdmin) {
    return { userId, isGlobalAdmin, role: "owner" };
  }
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return { userId, isGlobalAdmin, role: row?.role ?? null };
};

/** Lanza si el usuario no puede gestionar el entorno (owner/admin). */
export const requireWorkspaceManage = async (
  workspaceId: string
): Promise<{ userId: string; role: WorkspaceRole }> => {
  const { userId, role } = await getWorkspaceRole(workspaceId);
  if (!userId) throw new Error("No autenticado");
  if (role !== "owner" && role !== "admin") {
    throw new Error("No autorizado para gestionar este entorno");
  }
  return { userId, role };
};

/** Lanza si el usuario no es owner del entorno (acciones destructivas). */
export const requireWorkspaceOwner = async (
  workspaceId: string
): Promise<{ userId: string }> => {
  const { userId, role } = await getWorkspaceRole(workspaceId);
  if (!userId) throw new Error("No autenticado");
  if (role !== "owner") {
    throw new Error("Solo el propietario del entorno puede hacer esto");
  }
  return { userId };
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
