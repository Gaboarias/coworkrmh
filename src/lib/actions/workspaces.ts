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
  await requireWorkspaceManage(workspaceId);
  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId, role })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role },
    });
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

/** Cambiar el rol de un miembro (no toca al Owner; no asigna Owner aquí). */
export const setMemberRole = async (
  workspaceId: string,
  userId: string,
  role: Exclude<WorkspaceRole, "owner">
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
