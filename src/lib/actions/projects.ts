"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectMembers, buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ProjectStatus } from "@/lib/types";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";
import { createNotification } from "@/lib/actions/notifications";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/** Usuario + entorno activo, exigiendo la capacidad `projects.manage`. */
async function requireProjectsManage() {
  // requireUser y getActiveWorkspace son independientes — corren en paralelo.
  // Ambas llaman auth() internamente; Next.js 14 deduplica esa llamada.
  const [user, ws] = await Promise.all([requireUser(), getActiveWorkspace()]);
  if (!ws) throw new Error("Selecciona un entorno");
  const { permissions } = await getWorkspacePermissions(ws.id);
  if (!permissions.has("projects.manage")) {
    throw new Error(
      "No tenés permiso para gestionar proyectos en este entorno"
    );
  }
  return { user, ws };
}

export async function createProject(formData: {
  name: string;
  description?: string;
  bucketId?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
}) {
  const { user, ws } = await requireProjectsManage();

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: ws.id,
      name: formData.name,
      description: formData.description ?? null,
      bucketId: formData.bucketId ?? null,
      color: formData.color ?? null,
      startDate: formData.startDate ?? null,
      endDate: formData.endDate ?? null,
      dueDate: formData.dueDate ?? null,
      createdBy: user.id,
    })
    .returning();

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: user.id,
    role: "admin",
  });

  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  projectId: string,
  updates: {
    name?: string;
    description?: string | null;
    bucketId?: string | null;
    color?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    dueDate?: string | null;
    status?: ProjectStatus;
  }
) {
  await requireProjectsManage();
  await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, projectId));
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createBucket(formData: { name: string; color?: string }) {
  const { user } = await requireProjectsManage();
  const [bucket] = await db
    .insert(buckets)
    .values({ name: formData.name, color: formData.color ?? "#6B5FE4", createdBy: user.id })
    .returning();
  revalidatePath("/projects");
  return bucket;
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "admin" | "manager" | "member" = "member"
) {
  const { user: actor } = await requireProjectsManage();

  // Detectar si era ya member (para no notificar en actualización de role).
  const [existing] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);
  const isNewMember = !existing;

  await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role },
    });

  // Notification trigger: nuevo miembro agregado (no actor mismo).
  if (isNewMember && userId !== actor.id) {
    const [project] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    await createNotification({
      userId,
      type: "project_member_added",
      payload: {
        title: "Te sumaron a un proyecto",
        body: project?.name ?? "Nuevo proyecto",
        actorId: actor.id,
        actorName: actor.name ?? actor.email ?? undefined,
        refs: { projectId },
      },
      href: `/projects/${projectId}`,
    });
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  await requireProjectsManage();
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath(`/projects/${projectId}`);
}
