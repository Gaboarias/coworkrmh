"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users, projects } from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("No autorizado");
  return session.user;
};

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
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(users.name));
  return rows;
};

export const createWorkspace = async (formData: {
  name: string;
  color?: string;
}) => {
  const admin = await requireAdmin();
  const name = formData.name.trim();
  if (!name) throw new Error("El nombre es obligatorio");
  const [ws] = await db
    .insert(workspaces)
    .values({ name, color: formData.color ?? "#6B5FE4", createdBy: admin.id })
    .returning();
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: admin.id })
    .onConflictDoNothing();
  revalidatePath("/admin");
  return ws;
};

export const updateWorkspace = async (
  workspaceId: string,
  updates: { name?: string; color?: string }
) => {
  await requireAdmin();
  await db
    .update(workspaces)
    .set({
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));
  revalidatePath("/admin");
};

export const deleteWorkspace = async (workspaceId: string) => {
  await requireAdmin();
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

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string
) => {
  await requireAdmin();
  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId })
    .onConflictDoNothing();
  revalidatePath("/admin");
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string
) => {
  await requireAdmin();
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
