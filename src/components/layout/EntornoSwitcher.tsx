"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Shield, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Ws {
  id: string;
  name: string;
  color: string;
}
interface WsData {
  workspaces: Ws[];
  isAdmin: boolean;
  activeId: string | null;
}

export const EntornoSwitcher = () => {
  const [data, setData] = useState<WsData | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ws")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ workspaces: [], isAdmin: false, activeId: null }));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!data) {
    return (
      <div className="mx-3 mt-3 h-11 animate-pulse rounded-lg bg-[color-mix(in_oklab,var(--sidebar-foreground)_8%,transparent)]" />
    );
  }

  const active =
    data.workspaces.find((w) => w.id === data.activeId) ??
    data.workspaces[0] ??
    null;

  if (!active && !data.isAdmin) {
    return (
      <div className="mx-3 mt-3 rounded-lg border border-sidebar-border px-3 py-2 text-xs text-sidebar-muted">
        Sin entorno asignado. Pedí acceso a un administrador.
      </div>
    );
  }

  const next = encodeURIComponent("/dashboard");

  return (
    <div ref={ref} className="relative mx-3 mt-3">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-[color-mix(in_oklab,var(--sidebar-foreground)_6%,transparent)] px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active"
      >
        <span
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: active?.color ?? "#6B5FE4" }}
        >
          <Layers className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wider text-sidebar-muted">
            Entorno
          </span>
          <span className="block truncate text-sm font-semibold text-sidebar-foreground">
            {active?.name ?? "Administración"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-sidebar-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-elev-3"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {data.workspaces.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-muted">
                No hay entornos todavía.
              </li>
            )}
            {data.workspaces.map((w) => {
              const isActive = w.id === active?.id;
              return (
                <li key={w.id} role="option" aria-selected={isActive}>
                  <a
                    href={`/api/ws/switch?to=${w.id}&next=${next}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-el",
                      isActive ? "text-primary" : "text-text"
                    )}
                  >
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: w.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    {isActive && (
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          {data.isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-el hover:text-text"
            >
              <Shield className="h-4 w-4 flex-shrink-0" />
              Administración
            </a>
          )}
        </div>
      )}
    </div>
  );
};
