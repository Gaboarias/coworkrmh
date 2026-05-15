"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectMembers, buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
  dueDate?: string;
}) {
  const user = await requireUser();

  const [project] = await db
    .insert(projects)
    .values({
      name: formData.name,
      description: formData.description ?? null,
      bucketId: formData.bucketId ?? null,
      color: formData.color ?? null,
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
    dueDate?: string | null;
    status?: "active" | "archived" | "completed";
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
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath(`/projects/${projectId}`);
}
