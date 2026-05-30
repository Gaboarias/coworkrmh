"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { BaseToggle } from "@/components/shared/BaseToggle";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Proyectos",
  "/my-tasks": "Mis tareas",
  "/calendar": "Calendario",
  "/operations": "Operaciones",
  "/admin": "Administración",
  "/settings": "Configuración",
};

function getTitle(pathname: string): string {
  for (const [key, value] of Object.entries(pageTitles)) {
    if (pathname === key) return value;
  }
  if (pathname.startsWith("/projects/")) return "Proyecto";
  if (pathname.startsWith("/operations/")) return "Operaciones";
  if (pathname.startsWith("/admin")) return "Administración";
  return "Pistachio";
}

export function Topbar() {
  const pathname = usePathname();
  const { profile } = useUser();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface backdrop-blur-xl backdrop-saturate-150 px-6">
      <h2 className="text-sm font-semibold text-text-muted">
        {getTitle(pathname)}
      </h2>

      <div className="flex items-center gap-3">
        <button
          aria-label="Buscar"
          title="Buscar (⌘K)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-200 ease-out hover:bg-surface-el hover:text-text"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          aria-label="Notificaciones"
          title="Notificaciones"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-200 ease-out hover:bg-surface-el hover:text-text"
        >
          <Bell className="h-4 w-4" />
        </button>
        <BaseToggle />
        <ThemeToggle />
        <UserAvatar
          name={profile?.name}
          avatarUrl={profile?.image}
          size="sm"
        />
      </div>
    </header>
  );
}
