"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buckets, profiles, bucketMembers, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { SEED_PROFILES, ALL_PERMISSION_KEYS } from "@/lib/utils/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("No autorizado");
  return session.user;
}

function sanitizePerms(perms: unknown): string[] {
  if (!Array.isArray(perms)) return [];
  return perms.filter(
    (p): p is string => typeof p === "string" && ALL_PERMISSION_KEYS.includes(p)
  );
}

export async function seedDefaultProfiles(bucketId: string) {
  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.bucketId, bucketId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(profiles).values(
    SEED_PROFILES.map((p, i) => ({
      bucketId,
      name: p.name,
      description: p.description,
      permissions: p.permissions,
      isSystem: true,
      sortOrder: i,
    }))
  );
}

export async function listProfiles(bucketId: string) {
  await requireAdmin();
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.bucketId, bucketId))
    .orderBy(asc(profiles.sortOrder), asc(profiles.name));
}

export async function createProfile(formData: {
  bucketId: string;
  name: string;
  description?: string;
  permissions: string[];
}) {
  await requireAdmin();
  const [row] = await db
    .insert(profiles)
    .values({
      bucketId: formData.bucketId,
      name: formData.name.trim(),
      description: formData.description ?? null,
      permissions: sanitizePerms(formData.permissions),
      isSystem: false,
    })
    .returning();
  revalidatePath("/admin/negocios");
  return row;
}

export async function updateProfile(
  profileId: string,
  updates: { name?: string; description?: string; permissions?: string[] }
) {
  await requireAdmin();
  await db
    .update(profiles)
    .set({
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined
        ? { description: updates.description }
        : {}),
      ...(updates.permissions !== undefined
        ? { permissions: sanitizePerms(updates.permissions) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profileId));
  revalidatePath("/admin/negocios");
  revalidatePath("/operations");
}

export async function deleteProfile(profileId: string) {
  await requireAdmin();
  await db.delete(profiles).where(eq(profiles.id, profileId));
  revalidatePath("/admin/negocios");
}

export async function assignMemberProfile(
  bucketId: string,
  userId: string,
  data: {
    profileId?: string | null;
    responsibilities?: string | null;
    compensation?: string | null;
    memberStatus?: string;
  }
) {
  await requireAdmin();
  await db
    .update(bucketMembers)
    .set({
      ...(data.profileId !== undefined ? { profileId: data.profileId } : {}),
      ...(data.responsibilities !== undefined
        ? { responsibilities: data.responsibilities }
        : {}),
      ...(data.compensation !== undefined
        ? { compensation: data.compensation }
        : {}),
      ...(data.memberStatus !== undefined
        ? { memberStatus: data.memberStatus }
        : {}),
    })
    .where(
      and(
        eq(bucketMembers.bucketId, bucketId),
        eq(bucketMembers.userId, userId)
      )
    );
  revalidatePath("/admin/negocios");
  revalidatePath("/operations");
}

export async function updateTeamAgreements(
  bucketId: string,
  agreements: string
) {
  await requireAdmin();
  await db
    .update(buckets)
    .set({ teamAgreements: agreements, updatedAt: new Date() })
    .where(eq(buckets.id, bucketId));
  revalidatePath("/admin/negocios");
  revalidatePath(`/operations/${bucketId}/team`);
}

export interface TeamMemberRow {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "manager" | "member";
  profileId: string | null;
  profileName: string | null;
  responsibilities: string | null;
  compensation: string | null;
  memberStatus: string;
}

export async function listTeamMembers(
  bucketId: string
): Promise<TeamMemberRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: bucketMembers.role,
      profileId: bucketMembers.profileId,
      profileName: profiles.name,
      responsibilities: bucketMembers.responsibilities,
      compensation: bucketMembers.compensation,
      memberStatus: bucketMembers.memberStatus,
    })
    .from(bucketMembers)
    .leftJoin(users, eq(bucketMembers.userId, users.id))
    .leftJoin(profiles, eq(bucketMembers.profileId, profiles.id))
    .where(eq(bucketMembers.bucketId, bucketId));

  return rows
    .filter((r) => r.id != null)
    .map((r) => ({
      id: r.id as string,
      name: r.name ?? null,
      email: r.email ?? "",
      avatarUrl: r.avatarUrl ?? null,
      role: r.role,
      profileId: r.profileId ?? null,
      profileName: r.profileName ?? null,
      responsibilities: r.responsibilities ?? null,
      compensation: r.compensation ?? null,
      memberStatus: r.memberStatus ?? "active",
    }));
}

export interface UserAssignment {
  bucketId: string;
  bucketName: string;
  profileId: string | null;
  profileName: string | null;
  responsibilities: string | null;
  compensation: string | null;
  memberStatus: string;
}
export interface UserWithAssignments {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "manager" | "member";
  assignments: UserAssignment[];
}

export async function listUsersWithAssignments(): Promise<
  UserWithAssignments[]
> {
  await requireAdmin();
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users)
    .orderBy(asc(users.name));

  const memRows = await db
    .select({
      userId: bucketMembers.userId,
      bucketId: bucketMembers.bucketId,
      bucketName: buckets.name,
      profileId: bucketMembers.profileId,
      profileName: profiles.name,
      responsibilities: bucketMembers.responsibilities,
      compensation: bucketMembers.compensation,
      memberStatus: bucketMembers.memberStatus,
    })
    .from(bucketMembers)
    .leftJoin(buckets, eq(bucketMembers.bucketId, buckets.id))
    .leftJoin(profiles, eq(bucketMembers.profileId, profiles.id));

  const byUser = new Map<string, UserAssignment[]>();
  for (const m of memRows) {
    const list = byUser.get(m.userId) ?? [];
    list.push({
      bucketId: m.bucketId,
      bucketName: m.bucketName ?? "—",
      profileId: m.profileId ?? null,
      profileName: m.profileName ?? null,
      responsibilities: m.responsibilities ?? null,
      compensation: m.compensation ?? null,
      memberStatus: m.memberStatus ?? "active",
    });
    byUser.set(m.userId, list);
  }

  return userRows.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? "",
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    assignments: byUser.get(u.id) ?? [],
  }));
}

export interface BucketProfilesBundle {
  id: string;
  name: string;
  color: string | null;
  profiles: { id: string; name: string }[];
}

export async function listBucketsWithProfiles(): Promise<
  BucketProfilesBundle[]
> {
  await requireAdmin();
  const bRows = await db
    .select({ id: buckets.id, name: buckets.name, color: buckets.color })
    .from(buckets)
    .orderBy(asc(buckets.position));
  const pRows = await db
    .select({
      id: profiles.id,
      bucketId: profiles.bucketId,
      name: profiles.name,
    })
    .from(profiles)
    .orderBy(asc(profiles.sortOrder), asc(profiles.name));
  return bRows.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    profiles: pRows
      .filter((p) => p.bucketId === b.id)
      .map((p) => ({ id: p.id, name: p.name })),
  }));
}
