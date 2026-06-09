import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, projects } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  ALL_WS_PERMISSIONS,
  DEFAULT_WS_ROLE_PERMISSIONS,
} from "@/lib/constants/workspacePermissions";

export const WS_COOKIE = "ws";

// WorkspaceRole es string para soportar built-in (owner/admin/member) +
// roles custom definidos en workspaces.role_permissions. Owner es especial
// (bypass total) y nunca se almacena en la matriz.
export type WorkspaceRole = string;

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
const getWorkspaceRole = async (
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

/**
 * Lanza si el usuario no puede gestionar el entorno.
 * - owner / admin global → bypass.
 * - cualquier otro rol → debe tener `members.manage` en su set de permisos.
 *   Esto cubre el built-in "admin" (default tiene todas) Y roles custom que
 *   el owner haya autorizado a gestionar miembros/roles.
 */
export const requireWorkspaceManage = async (
  workspaceId: string
): Promise<{ userId: string; role: WorkspaceRole }> => {
  const { userId, role, isGlobalAdmin } = await getWorkspaceRole(workspaceId);
  if (!userId) throw new Error("No autenticado");
  if (role === "owner" || isGlobalAdmin) {
    return { userId, role: role ?? "owner" };
  }
  if (!role) {
    throw new Error("No autorizado para gestionar este entorno");
  }
  const { permissions } = await getWorkspacePermissions(workspaceId);
  if (!permissions.has("members.manage")) {
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

/**
 * Permisos efectivos del usuario actual en un entorno (matriz configurable).
 * - owner / admin global → todas las capacidades (bypass, no leen la matriz).
 * - admin / member de entorno → `workspaces.role_permissions[role]`.
 * - no miembro → set vacío.
 */
export const getWorkspacePermissions = async (
  workspaceId: string
): Promise<{
  userId: string;
  role: WorkspaceRole | null;
  isGlobalAdmin: boolean;
  permissions: Set<string>;
}> => {
  const { userId, role, isGlobalAdmin } = await getWorkspaceRole(workspaceId);
  if (!userId || role === null) {
    return { userId, role, isGlobalAdmin, permissions: new Set() };
  }
  if (role === "owner") {
    return {
      userId,
      role,
      isGlobalAdmin,
      permissions: new Set(ALL_WS_PERMISSIONS),
    };
  }
  const [row] = await db
    .select({ rp: workspaces.rolePermissions })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const rp = (row?.rp ?? DEFAULT_WS_ROLE_PERMISSIONS) as Record<
    string,
    string[]
  >;
  // Roles custom + built-in (admin/member) viven en la misma matriz; si el
  // rol del usuario no existe en ella, set vacío (deny por defecto, seguro).
  const keys = rp[role] ?? [];
  return {
    userId,
    role,
    isGlobalAdmin,
    permissions: new Set(keys),
  };
};

/**
 * Helper compartido para acciones scoped a un proyecto:
 * resuelve workspaceId del proyecto + verifica que el usuario sea miembro.
 * Lanza error claro y diagnosticable si no aplica.
 */
export const requireProjectAccess = async (
  projectId: string
): Promise<{ userId: string; workspaceId: string }> => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const [p] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!p) throw new Error("Proyecto no encontrado");
  if (!(await canAccessWorkspace(p.workspaceId))) {
    throw new Error("No tenés acceso al entorno de este proyecto");
  }
  return { userId: session.user.id, workspaceId: p.workspaceId };
};

/**
 * Atajo para páginas server: entorno activo + un `can(key)` ya resuelto.
 * Si no hay entorno activo, `ws` es null y `can` siempre false.
 */
export const getActiveWorkspaceWithPermissions = async (): Promise<{
  ws: Workspace | null;
  can: (key: string) => boolean;
}> => {
  const ws = await getActiveWorkspace();
  if (!ws) return { ws: null, can: () => false };
  const { permissions } = await getWorkspacePermissions(ws.id);
  return { ws, can: (key: string) => permissions.has(key) };
};
