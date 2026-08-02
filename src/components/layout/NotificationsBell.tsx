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
import { IconButton } from "@/components/ui/IconButton";

/**
 * Bell + drawer slide-in (Sunset Aurora · N4).
 *
 * - Polling cada 2 min del unread count, y SOLO con la pestaña visible.
 *   Una pestaña en background no necesita el conteo y cada consulta quema
 *   compute de la DB (Neon). Al volver a foco refrescamos de inmediato.
 * - Drawer del lado derecho cuando se abre la campana; lista las últimas 50.
 * - Mark-as-read individual y "marcar todas".
 */

const POLL_INTERVAL_MS = 120_000;

/**
 * Acción secundaria del drawer ("Marcar todas", "Ver todas").
 * Una se escribe como `<button>` y la otra como `<Link>`, así que comparten la
 * receta de clases pero no el elemento — por eso una constante y no un
 * componente que tendría que recibir un flag para decidir qué renderizar.
 */
const drawerAction =
  "inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink";

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
    // Poll solo con la pestaña visible; una pestaña oculta no consulta.
    const tick = () => {
      if (!document.hidden) pollUnread();
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    // Al volver a foco, refresco inmediato para no esperar el próximo tick.
    const onVisible = () => {
      if (!document.hidden) pollUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
      <IconButton
        ref={btnRef}
        size="lg"
        tone="faint"
        label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-urgent px-1 text-[11px] font-bold text-on-solid"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </IconButton>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-50 mt-1 w-[380px] max-w-[calc(100vw-32px)] animate-slide-up overflow-hidden rounded-lg border border-rule bg-surface-el shadow-elev-3"
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Notificaciones</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className={drawerAction}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">
                Cargando…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-ink-soft">
                Sin notificaciones todavía.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {items.map((item) => {
                  const isUnread = !item.readAt;
                  const inner = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-surface cursor-pointer",
                        isUnread && "bg-accent-soft"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 flex-shrink-0 rounded-full",
                          isUnread ? "bg-accent" : "bg-transparent"
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            isUnread
                              ? "font-medium text-ink"
                              : "text-ink-soft"
                          )}
                        >
                          {item.payload.title}
                        </p>
                        {item.payload.body && (
                          <p className="mt-1 truncate text-xs text-ink-faint">
                            {item.payload.body}
                          </p>
                        )}
                        <p className="mt-1 text-[13px] text-ink-faint">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                      {isUnread && (
                        <Check
                          aria-hidden
                          className="h-4 w-4 flex-shrink-0 self-center text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
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
          <div className="border-t border-rule px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className={drawerAction}
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
