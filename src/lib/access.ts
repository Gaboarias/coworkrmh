import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { buckets, bucketMembers, profiles } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { ALL_PERMISSION_KEYS } from "@/lib/utils/permissions";

export interface AccessibleBucket {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Buckets (equipos/negocios) que el usuario actual puede ver.
 * - admin: todos los buckets (gestiona todo).
 * - resto: solo los buckets donde tiene fila en bucket_members.
 */
export async function getAccessibleBuckets(): Promise<{
  userId: string;
  role: string;
  isAdmin: boolean;
  buckets: AccessibleBucket[];
}> {
  const session = await auth();
  if (!session?.user) {
    return { userId: "", role: "", isAdmin: false, buckets: [] };
  }
  const userId = session.user.id;
  const role = (session.user.role as string) ?? "member";
  const isAdmin = role === "admin";

  if (isAdmin) {
    const rows = await db
      .select({ id: buckets.id, name: buckets.name, color: buckets.color })
      .from(buckets)
      .orderBy(asc(buckets.position));
    return { userId, role, isAdmin, buckets: rows };
  }

  const memberRows = await db
    .select({ bucketId: bucketMembers.bucketId })
    .from(bucketMembers)
    .where(eq(bucketMembers.userId, userId));

  const ids = memberRows.map((m) => m.bucketId);
  if (ids.length === 0) {
    return { userId, role, isAdmin, buckets: [] };
  }

  const rows = await db
    .select({ id: buckets.id, name: buckets.name, color: buckets.color })
    .from(buckets)
    .where(inArray(buckets.id, ids))
    .orderBy(asc(buckets.position));

  return { userId, role, isAdmin, buckets: rows };
}

/** True si el usuario puede acceder a un bucket concreto. */
export async function canAccessBucket(bucketId: string): Promise<boolean> {
  const { buckets: list } = await getAccessibleBuckets();
  return list.some((b) => b.id === bucketId);
}

/**
 * Permisos efectivos del usuario actual dentro de un negocio (bucket).
 * - super-admin global (users.role==='admin'): todas (bypass).
 * - resto: las del perfil asignado en bucket_members; sin perfil → [].
 */
export async function getBucketPermissions(
  bucketId: string
): Promise<{ userId: string; isAdmin: boolean; permissions: string[] }> {
  const session = await auth();
  if (!session?.user) {
    return { userId: "", isAdmin: false, permissions: [] };
  }
  const userId = session.user.id;
  const isAdmin = ((session.user.role as string) ?? "member") === "admin";
  if (isAdmin) {
    return { userId, isAdmin, permissions: ALL_PERMISSION_KEYS };
  }

  const [row] = await db
    .select({ perms: profiles.permissions })
    .from(bucketMembers)
    .leftJoin(profiles, eq(bucketMembers.profileId, profiles.id))
    .where(
      and(
        eq(bucketMembers.bucketId, bucketId),
        eq(bucketMembers.userId, userId)
      )
    )
    .limit(1);

  return {
    userId,
    isAdmin,
    permissions: (row?.perms as string[] | null) ?? [],
  };
}

/** True si el usuario tiene una clave de permiso en el negocio. */
export async function bucketCan(
  bucketId: string,
  key: string
): Promise<boolean> {
  const { permissions } = await getBucketPermissions(bucketId);
  return permissions.includes(key);
}

/**
 * Guard de páginas de Operaciones: valida acceso al negocio y devuelve su
 * nombre. Si no tiene acceso, redirige a /operations. Reemplaza el dúo
 * repetido canAccessBucket + getBucketName en cada página.
 */
export async function requireBucketAccess(
  bucketId: string
): Promise<{ bucketName: string }> {
  if (!(await canAccessBucket(bucketId))) {
    redirect("/operations");
  }
  const [b] = await db
    .select({ name: buckets.name })
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .limit(1);
  return { bucketName: b?.name ?? "" };
}
