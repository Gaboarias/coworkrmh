import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buckets, bucketMembers } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

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
