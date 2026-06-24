"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/useUser";
import { UserAvatar } from "@/components/shared/UserAvatar";

/**
 * Dropdown que se abre desde el avatar del topbar.
 * Reemplaza el cluster de botones placeholder (search, notifs, toggles)
 * que tenía el topbar antes.
 *
 * Contenido: header con nombre+email + items (Configuración, Cerrar sesión).
 * Se cierra con Escape, click afuera o navegando.
 */
export function AvatarDropdown() {
  const { profile } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  async function handleLogout() {
    toast.success("Sesión cerrada");
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de cuenta"
        title="Cuenta"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
      >
        <UserAvatar
          name={profile?.name ?? undefined}
          avatarUrl={profile?.image ?? undefined}
          size="sm"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 animate-slide-up overflow-hidden rounded-lg border border-border bg-surface-el shadow-elev-3"
        >
          {/* Header: identidad */}
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-sm font-medium text-text">
              {profile?.name ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {profile?.email}
            </p>
          </div>

          {/* Items */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              Configuración
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-danger"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
