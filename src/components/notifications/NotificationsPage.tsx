"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";

interface NotificationsPageProps {
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
  total: number;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateGroup(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays <= 7) return "Esta semana";
  return "Antes";
}

const GROUP_ORDER = ["Hoy", "Ayer", "Esta semana", "Antes"];

export function NotificationsPage({
  initialNotifications,
  initialUnreadCount,
  total,
}: NotificationsPageProps) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>(initialNotifications);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [markingAll, setMarkingAll] = useState(false);

  // Agrupar por fecha
  const groups: Record<string, NotificationRow[]> = {};
  for (const item of items) {
    const g = getDateGroup(item.createdAt);
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }

  const handleClickItem = useCallback(
    async (item: NotificationRow) => {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n
          )
        );
        setUnread((u) => Math.max(0, u - 1));
      }
      if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        }))
      );
      setUnread(0);
      toast.success("Todas marcadas como leídas");
    } catch (err) {
      toast.error((err as Error).message || "Error");
    } finally {
      setMarkingAll(false);
    }
  }, []);

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ notificaciones"
        title="Notificaciones,"
        subtitle="actividad reciente."
        issueLines={[
          `${total} TOTAL`,
          unread > 0 ? `${unread} SIN LEER` : "AL DÍA",
        ]}
      />

      {/* Acciones globales */}
      {unread > 0 && (
        <div className="mb-6 flex items-center justify-end">
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como leídas
          </button>
        </div>
      )}

      {/* Lista agrupada */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
          <Bell className="mb-4 h-10 w-10 opacity-30" />
          <p className="text-sm">Sin notificaciones todavía.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {GROUP_ORDER.filter((g) => groups[g]?.length > 0).map((groupName) => (
            <section key={groupName}>
              <HairlineRule
                label={groupName}
                count={`${groups[groupName].length}`}
              />
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface-el overflow-hidden">
                {groups[groupName].map((item) => {
                  const isUnread = !item.readAt;
                  const inner = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface",
                        isUnread &&
                          "bg-[color-mix(in_oklab,var(--coral)_5%,transparent)]"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                          isUnread ? "bg-[var(--coral)]" : "bg-transparent"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            isUnread
                              ? "font-medium text-text"
                              : "text-text-muted"
                          )}
                        >
                          {item.payload.title}
                        </p>
                        {item.payload.body && (
                          <p className="mt-0.5 text-xs text-text-tertiary line-clamp-1">
                            {item.payload.body}
                          </p>
                        )}
                        <p className="mt-1 text-[13px] text-text-tertiary">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            void handleClickItem(item);
                          }}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleClickItem(item)}
                          className="block w-full text-left"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
