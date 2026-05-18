"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buckets, bucketMembers, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { seedDefaultProfiles } from "@/lib/actions/profiles";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("No autorizado");
  return session.user;
}

export async function listBusinessBuckets() {
  await requireAdmin();
  return db
    .select({
      id: buckets.id,
      name: buckets.name,
      color: buckets.color,
      position: buckets.position,
    })
    .from(buckets)
    .orderBy(asc(buckets.position));
}

export async function listBucketMembers(bucketId: string) {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: bucketMembers.role,
    })
    .from(bucketMembers)
    .leftJoin(users, eq(bucketMembers.userId, users.id))
    .where(eq(bucketMembers.bucketId, bucketId));

  return rows
    .filter((r) => r.id != null)
    .map((r) => ({
      id: r.id as string,
      name: r.name ?? null,
      email: r.email ?? "",
      avatarUrl: r.avatarUrl ?? null,
      role: r.role,
    }));
}

export async function createBusinessBucket(formData: {
  name: string;
  color?: string;
}) {
  const user = await requireAdmin();
  const [bucket] = await db
    .insert(buckets)
    .values({
      name: formData.name.trim(),
      color: formData.color ?? "#6B5FE4",
      createdBy: user.id,
    })
    .returning();

  // El creador queda como miembro admin del equipo.
  await db
    .insert(bucketMembers)
    .values({ bucketId: bucket.id, userId: user.id, role: "admin" })
    .onConflictDoNothing();

  // Perfiles semilla editables (Fundador/Admin, Diseño+Redes, Constructor…).
  await seedDefaultProfiles(bucket.id);

  revalidatePath("/settings/teams");
  revalidatePath("/operations");
  return bucket;
}

export async function updateBusinessBucket(
  bucketId: string,
  updates: { name?: string; color?: string }
) {
  await requireAdmin();
  await db
    .update(buckets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(buckets.id, bucketId));
  revalidatePath("/settings/teams");
}

export async function addBucketMember(
  bucketId: string,
  userId: string,
  role: "admin" | "manager" | "member" = "member"
) {
  await requireAdmin();
  await db
    .insert(bucketMembers)
    .values({ bucketId, userId, role })
    .onConflictDoUpdate({
      target: [bucketMembers.bucketId, bucketMembers.userId],
      set: { role },
    });
  revalidatePath("/settings/teams");
  revalidatePath("/operations");
}

export async function removeBucketMember(bucketId: string, userId: string) {
  await requireAdmin();
  await db
    .delete(bucketMembers)
    .where(
      and(
        eq(bucketMembers.bucketId, bucketId),
        eq(bucketMembers.userId, userId)
      )
    );
  revalidatePath("/settings/teams");
  revalidatePath("/operations");
}
