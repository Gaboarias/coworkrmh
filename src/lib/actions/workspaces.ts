"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users, projects } from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import {
  requireWorkspaceManage,
  requireWorkspaceOwner,
  type WorkspaceRole,
} from "@/lib/workspace";
import {
  ALL_WS_PERMISSIONS,
  DEFAULT_WS_ROLE_PERMISSIONS,
  BUILTIN_ROLE_KEYS,
  sanitizeRoleKey,
  type WsRolePermissions,
} from "@/lib/constants/workspacePermissions";
import { createNotification } from "@/lib/actions/notifications";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("No autorizado");
  return session.user;
};

const requireUser = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
};

// ─── Lecturas (panel admin global) ────────────────────────────────────────────

export const listWorkspacesAdmin = async () => {
  await requireAdmin();
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      color: workspaces.color,
      memberCount: sql<number>`count(${workspaceMembers.userId})::int`,
    })
    .from(workspaces)
    .leftJoin(
      workspaceMembers,
      eq(workspaceMembers.workspaceId, workspaces.id)
    )
    .groupBy(workspaces.id)
    .orderBy(asc(workspaces.name));
};

export const listAllUsers = async () => {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users)
    .orderBy(asc(users.name));
};

export const listWorkspaceMembers = async (workspaceId: string) => {
  await requireWorkspaceManage(workspaceId);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(users.name));
  return rows;
};

// ─── Crear entorno ────────────────────────────────────────────────────────────

const insertWorkspaceWithOwner = async (
  name: string,
  color: string | undefined,
  ownerId: string
) => {
  const clean = name.trim();
  if (!clean) throw new Error("El nombre es obligatorio");
  const [ws] = await db
    .insert(workspaces)
    .values({ name: clean, color: color ?? "#6B5FE4", createdBy: ownerId })
    .returning();
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: ownerId, role: "owner" })
    .onConflictDoNothing();
  return ws;
};

/** Cualquier usuario autenticado crea un entorno y queda como Owner. */
export const createOwnedWorkspace = async (formData: {
  name: string;
  color?: string;
}) => {
  const user = await requireUser();
  const ws = await insertWorkspaceWithOwner(
    formData.name,
    formData.color,
    user.id
  );
  revalidatePath("/admin");
  revalidatePath("/operations");
  return ws;
};

/** Crear desde el panel admin global (el admin queda Owner). */
export const createWorkspace = async (formData: {
  name: string;
  color?: string;
}) => {
  const admin = await requireAdmin();
  const ws = await insertWorkspaceWithOwner(
    formData.name,
    formData.color,
    admin.id
  );
  revalidatePath("/admin");
  return ws;
};

// ─── Editar / borrar ──────────────────────────────────────────────────────────

export const updateWorkspace = async (
  workspaceId: string,
  updates: { name?: string; color?: string }
) => {
  await requireWorkspaceManage(workspaceId);
  await db
    .update(workspaces)
    .set({
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
  revalidatePath("/operations");
};

export const deleteWorkspace = async (workspaceId: string) => {
  await requireWorkspaceOwner(workspaceId);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));
  if (n > 0) {
    throw new Error(
      `No se puede eliminar: el entorno tiene ${n} proyecto(s). Movélos o archivalos primero.`
    );
  }
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
};

// ─── Miembros ─────────────────────────────────────────────────────────────────

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  role: "admin" | "member" = "member"
) => {
  const actor = await requireWorkspaceManage(workspaceId);

  // Detectar si era ya member (para no notificar en actualización de role).
  const [existing] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  const isNewMember = !existing;

  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId, role })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role },
    });

  // Notification trigger: nuevo miembro agregado al entorno (no self).
  if (isNewMember && userId !== actor.userId) {
    const [ws] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const [actorRow] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);
    await createNotification({
      userId,
      type: "workspace_member_added",
      payload: {
        title: "Te sumaron a un entorno",
        body: ws?.name ?? "Nuevo entorno",
        actorId: actor.userId,
        actorName: actorRow?.name ?? actorRow?.email ?? undefined,
        refs: { workspaceId },
      },
      href: "/dashboard",
    });
  }

  revalidatePath("/admin");
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string
) => {
  await requireWorkspaceManage(workspaceId);
  const [target] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  if (target?.role === "owner") {
    throw new Error("No se puede quitar al propietario del entorno");
  }
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
  revalidatePath("/admin");
};

/** Cambiar el rol de un miembro. Acepta built-in (admin/member) o cualquier
 *  rol custom presente en la matriz del entorno. Nunca asigna "owner". */
export const setMemberRole = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
) => {
  await requireWorkspaceManage(workspaceId);
  if (role === "owner") {
    throw new Error("No se puede asignar el rol \"owner\"");
  }
  // El rol debe existir: built-in o custom registrado en la matriz.
  const [wsRow] = await db
    .select({ rp: workspaces.rolePermissions })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const matrix = (wsRow?.rp ?? DEFAULT_WS_ROLE_PERMISSIONS) as WsRolePermissions;
  const valid = new Set<string>([
    ...BUILTIN_ROLE_KEYS,
    ...Object.keys(matrix),
  ]);
  if (!valid.has(role)) {
    throw new Error(`El rol "${role}" no existe en este entorno`);
  }
  const [target] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  if (!target) throw new Error("El usuario no es miembro del entorno");
  if (target.role === "owner") {
    throw new Error("No se puede cambiar el rol del propietario");
  }
  await db
    .update(workspaceMembers)
    .set({ role })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
  revalidatePath("/admin");
  revalidatePath("/operations");
};

// ─── Matriz de permisos por entorno ───────────────────────────────────────────

/** Matriz vigente del entorno (incluye built-in admin/member + roles custom). */
export const getWorkspacePermissionMatrix = async (
  workspaceId: string
): Promise<WsRolePermissions> => {
  await requireWorkspaceManage(workspaceId);
  const [row] = await db
    .select({ rp: workspaces.rolePermissions })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const rp = (row?.rp ?? DEFAULT_WS_ROLE_PERMISSIONS) as WsRolePermissions;
  // Garantiza presencia de los built-in con sus defaults si la fila vieja
  // no los tiene (defensivo, sin sobrescribir overrides existentes).
  return {
    admin: rp.admin ?? DEFAULT_WS_ROLE_PERMISSIONS.admin,
    member: rp.member ?? DEFAULT_WS_ROLE_PERMISSIONS.member,
    ...Object.fromEntries(
      Object.entries(rp).filter(([k]) => !BUILTIN_ROLE_KEYS.includes(k as never))
    ),
  };
};

const sanitizePermissionKeys = (keys: string[]): string[] => {
  const allow = new Set(ALL_WS_PERMISSIONS);
  return [...new Set(keys)].filter((k) => allow.has(k));
};

/** Reemplaza la matriz role→permisos del entorno. Sanitiza claves y nombres
 *  de rol. No permite eliminar los built-in admin/member desde aquí (para
 *  eso usar deleteCustomWorkspaceRole sobre roles custom). */
export const updateWorkspacePermissions = async (
  workspaceId: string,
  matrix: WsRolePermissions
) => {
  await requireWorkspaceManage(workspaceId);
  // Cada rol: claves de permiso saneadas; conservar siempre admin/member.
  const clean: WsRolePermissions = {
    admin: sanitizePermissionKeys(matrix.admin ?? DEFAULT_WS_ROLE_PERMISSIONS.admin),
    member: sanitizePermissionKeys(matrix.member ?? DEFAULT_WS_ROLE_PERMISSIONS.member),
  };
  for (const [key, perms] of Object.entries(matrix)) {
    if (BUILTIN_ROLE_KEYS.includes(key as never)) continue;
    if (key === "owner") continue; // reservado, no se persiste
    clean[key] = sanitizePermissionKeys(perms);
  }
  await db
    .update(workspaces)
    .set({ rolePermissions: clean, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
  revalidatePath("/operations");
};

/** Crea un rol custom en el entorno. Permisos iniciales = views (solo lectura)
 *  por defecto; el admin los edita en la matriz. */
export const createCustomWorkspaceRole = async (
  workspaceId: string,
  rawName: string
): Promise<{ key: string }> => {
  await requireWorkspaceManage(workspaceId);
  const key = sanitizeRoleKey(rawName);
  if (BUILTIN_ROLE_KEYS.includes(key.toLowerCase() as never)) {
    throw new Error(`"${key}" colisiona con un rol built-in`);
  }
  const [row] = await db
    .select({ rp: workspaces.rolePermissions })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const matrix = (row?.rp ?? DEFAULT_WS_ROLE_PERMISSIONS) as WsRolePermissions;
  if (matrix[key]) {
    throw new Error(`Ya existe un rol llamado "${key}"`);
  }
  const next: WsRolePermissions = {
    ...matrix,
    [key]: DEFAULT_WS_ROLE_PERMISSIONS.member, // sólo views por defecto
  };
  await db
    .update(workspaces)
    .set({ rolePermissions: next, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
  return { key };
};

/** Elimina un rol custom. Miembros con ese rol se reasignan a "member". */
export const deleteCustomWorkspaceRole = async (
  workspaceId: string,
  roleKey: string
) => {
  await requireWorkspaceManage(workspaceId);
  if (BUILTIN_ROLE_KEYS.includes(roleKey as never) || roleKey === "owner") {
    throw new Error("No se puede eliminar un rol built-in");
  }
  const [row] = await db
    .select({ rp: workspaces.rolePermissions })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const matrix = (row?.rp ?? DEFAULT_WS_ROLE_PERMISSIONS) as WsRolePermissions;
  if (!matrix[roleKey]) {
    throw new Error(`El rol "${roleKey}" no existe`);
  }
  // Reasignar miembros con ese rol → member.
  await db
    .update(workspaceMembers)
    .set({ role: "member" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, roleKey)
      )
    );
  // Quitar el rol de la matriz.
  const next: WsRolePermissions = Object.fromEntries(
    Object.entries(matrix).filter(([k]) => k !== roleKey)
  );
  await db
    .update(workspaces)
    .set({ rolePermissions: next, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
  revalidatePath("/operations");
};
