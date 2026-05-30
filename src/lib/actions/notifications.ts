"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, type NotificationPayload } from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

/** Tipo (string union) — espejo del enum DB. */
export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_status_changed"
  | "note_mentioned"
  | "project_member_added"
  | "workspace_member_added"
  | "comment_reply";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Crea una notificación. Llamada internamente desde otras actions
 * (no expuesta vía UI directamente). Si el destinatario es el propio actor,
 * no se crea (no auto-notificarte).
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  href?: string;
}) {
  // No auto-notificar al actor
  if (input.payload.actorId && input.payload.actorId === input.userId) {
    return null;
  }
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
      href: input.href ?? null,
    })
    .returning();
  return row;
}

/** Lista las notificaciones del usuario actual (más recientes primero). */
export async function listMyNotifications(): Promise<{
  notifications: NotificationRow[];
  unreadCount: number;
}> {
  const session = await auth();
  if (!session?.user) return { notifications: [], unreadCount: 0 };

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt)
      )
    );

  return {
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      payload: r.payload,
      href: r.href,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadCount: unread,
  };
}

/** Cuenta unread (endpoint barato para polling). */
export async function getUnreadCount(): Promise<number> {
  const session = await auth();
  if (!session?.user) return 0;
  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt)
      )
    );
  return unread;
}

/** Marcar una notificación como leída. */
export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, session.user.id)
      )
    );
  revalidatePath("/");
}

/** Marcar todas las del usuario como leídas. */
export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt)
      )
    );
  revalidatePath("/");
}
