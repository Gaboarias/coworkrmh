"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, users, type NotificationPayload } from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import {
  getAppUrl,
  sendTaskAssignedEmail,
  sendProjectMemberAddedEmail,
} from "@/lib/email";

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

  // Dispatch email para tipos que lo requieren.
  // Fire-and-forget: no bloqueamos la respuesta — si falla el email,
  // la notificación in-app ya está creada y es lo que cuenta.
  if (input.type === "task_assigned" || input.type === "project_member_added") {
    void dispatchEmail(input);
  }

  return row;
}

/** Envía el correo correspondiente según el tipo de notificación. */
async function dispatchEmail(input: {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  href?: string;
}) {
  try {
    const [recipient] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!recipient?.email) return;

    const base = getAppUrl();
    const url = input.href ? `${base}${input.href}` : base;

    if (input.type === "task_assigned") {
      await sendTaskAssignedEmail({
        to: recipient.email,
        recipientName: recipient.name,
        taskAndProject: input.payload.body ?? "Tarea nueva",
        assignerName: input.payload.actorName,
        taskUrl: url,
      });
    } else if (input.type === "project_member_added") {
      await sendProjectMemberAddedEmail({
        to: recipient.email,
        recipientName: recipient.name,
        projectName: input.payload.body ?? "Proyecto",
        inviterName: input.payload.actorName,
        projectUrl: url,
      });
    }
  } catch {
    // Email failure is non-fatal — log silently, don't surface to caller.
    // Monitorear desde Resend dashboard si hay entregas fallidas.
  }
}

/** Lista las notificaciones del usuario actual (más recientes primero). */
export async function listMyNotifications(): Promise<{
  notifications: NotificationRow[];
  unreadCount: number;
}> {
  const session = await auth();
  if (!session?.user) return { notifications: [], unreadCount: 0 };

  // Filas de notificaciones y conteo unread son independientes — paralelizar.
  const [rows, [{ unread }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt)
        )
      ),
  ]);

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

/**
 * Lista completa de notificaciones del usuario (para la página /notifications).
 * Soporta paginación offset-limit; incluye total de registros.
 */
export async function listAllMyNotifications(
  limit = 100,
  offset = 0
): Promise<{
  notifications: NotificationRow[];
  unreadCount: number;
  total: number;
}> {
  const session = await auth();
  if (!session?.user) return { notifications: [], unreadCount: 0, total: 0 };

  const [rows, [{ unread }], [{ total }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt)
        )
      ),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id)),
  ]);

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
    total,
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
