"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectMembers, buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ProjectStatus } from "@/lib/types";
import { getActiveWorkspace } from "@/lib/workspace";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
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
  const user = await requireUser();
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error("Selecciona un entorno antes de crear un proyecto");

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
  await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, projectId));
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createBucket(formData: { name: string; color?: string }) {
  const user = await requireUser();
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
  await requireUser();
  await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role },
    });
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  await requireUser();
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath(`/projects/${projectId}`);
}
