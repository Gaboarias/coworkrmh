"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  type NotificationRow,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils/cn";
import { formatDateCR } from "@/lib/utils/datetime";

/**
 * Bell + drawer slide-in (Sunset Aurora · N4).
 *
 * - Polling cada 30s del unread count (cheap server call).
 * - Drawer del lado derecho cuando se abre la campana; lista las últimas 50.
 * - Mark-as-read individual y "marcar todas".
 */

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return formatDateCR(iso);
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Polling de unread count
  const pollUnread = useCallback(async () => {
    try {
      const n = await getUnreadCount();
      setUnread(n);
    } catch {
      /* fallar silencioso */
    }
  }, []);

  useEffect(() => {
    pollUnread();
    const id = setInterval(pollUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollUnread]);

  // Cargar lista cuando se abre el drawer
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { notifications, unreadCount } = await listMyNotifications();
      setItems(notifications);
      setUnread(unreadCount);
    } catch (err) {
      toast.error((err as Error).message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Cerrar con click afuera / Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleClickItem(item: NotificationRow) {
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
      setOpen(false);
      router.push(item.href);
    }
  }

  async function handleMarkAll() {
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
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-el hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--coral)_35%,transparent)]"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--coral)] px-1 text-[11px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-50 mt-1 w-[380px] max-w-[calc(100vw-32px)] animate-slide-up overflow-hidden rounded-lg border border-border bg-surface-el shadow-elev-3"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Notificaciones</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                Cargando…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-text-muted">
                Sin notificaciones todavía.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const isUnread = !item.readAt;
                  const inner = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-surface cursor-pointer",
                        isUnread && "bg-[color-mix(in_oklab,var(--coral)_5%,transparent)]"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 flex-shrink-0 rounded-full",
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
                          <p className="mt-0.5 truncate text-xs text-text-tertiary">
                            {item.payload.body}
                          </p>
                        )}
                        <p className="mt-1 text-[13px] text-text-tertiary">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                      {isUnread && (
                        <Check
                          aria-hidden
                          className="h-4 w-4 flex-shrink-0 self-center text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      )}
                    </div>
                  );
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            handleClickItem(item);
                          }}
                          className="group block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClickItem(item)}
                          className="group block w-full text-left"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer — link a la página completa */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              Ver todas
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
