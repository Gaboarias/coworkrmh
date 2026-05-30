"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Settings,
  Briefcase,
  BarChart3,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/lib/hooks/useUser";
import { EntornoSwitcher } from "@/components/layout/EntornoSwitcher";

/**
 * Sidebar (Sunset Aurora · N2).
 *
 * Cambios vs N1:
 * - Items agrupados en secciones (TRABAJO / ANALYTICS / SISTEMA) con
 *   headers chicos en uppercase tracking expandido.
 * - Colapsable: 240px ↔ 56px icon-only, persistido en localStorage
 *   (`pistachio-sidebar-collapsed`).
 * - Slots reservados para Reportes (N5), Notificaciones (N4 con badge),
 *   Admin (visible si session.user.role === "admin").
 * - Sin user/logout (ya viven en AvatarDropdown del Topbar).
 */

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: number | "soon";
  adminOnly?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    id: "work",
    label: "Trabajo",
    items: [
      { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
      { href: "/projects", label: "Proyectos", icon: FolderKanban },
      { href: "/my-tasks", label: "Mis tareas", icon: CheckSquare },
      { href: "/calendar", label: "Calendario", icon: Calendar },
      { href: "/operations", label: "Operaciones", icon: Briefcase },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { href: "/reports", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      // Notificaciones viven en la campana del topbar — sin entrada duplicada acá.
      { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    ],
  },
];

const COLLAPSED_KEY = "pistachio-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useUser();
  const isAdmin = profile?.role === "admin";

  // Estado collapsed con persistencia localStorage. Inicializa false en
  // SSR; lee localStorage en mount (evita hydration mismatch).
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const navActive =
    "bg-[color-mix(in_oklab,var(--sidebar-active)_16%,transparent)] text-sidebar-active";
  const navIdle =
    "text-sidebar-muted hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_8%,transparent)] hover:text-sidebar-foreground";

  const w = collapsed ? "w-14" : "w-60";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl backdrop-saturate-150 transition-[width] duration-200 ease-out",
        w,
        // Evita flash de contenido pre-hydration mostrando expanded por default.
        !hydrated && "opacity-0",
        hydrated && "opacity-100"
      )}
    >
      {/* Logo + toggle */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border",
          collapsed ? "h-[57px] justify-center px-2" : "h-[57px] gap-3 px-5"
        )}
      >
        <img
          src="/pistachio-logo.svg"
          alt="Pistachio"
          className="h-8 w-8 flex-shrink-0 rounded-lg"
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-sidebar-foreground">
              Pistachio
            </p>
            <p className="truncate text-xs text-sidebar-muted">
              Rewind Media House
            </p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Colapsar sidebar"
            title="Colapsar (⌘\\)"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_8%,transparent)] hover:text-sidebar-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Botón expandir cuando está collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expandir sidebar"
          title="Expandir"
          className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-[color-mix(in_oklab,var(--sidebar-foreground)_8%,transparent)] hover:text-sidebar-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Entorno activo (oculto en collapsed para ahorrar espacio) */}
      {!collapsed && <EntornoSwitcher />}

      {/* Navigation por secciones */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (it) => !it.adminOnly || isAdmin
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.id} className="mb-4 last:mb-0">
              {!collapsed && (
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                  {section.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  const isPlaceholder = item.badge === "soon";
                  return (
                    <li key={item.href}>
                      <Link
                        href={isPlaceholder ? "#" : item.href}
                        aria-disabled={isPlaceholder}
                        onClick={(e) => {
                          if (isPlaceholder) e.preventDefault();
                        }}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                          collapsed
                            ? "justify-center"
                            : "gap-3",
                          active ? navActive : navIdle,
                          isPlaceholder && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {!collapsed && item.badge === "soon" && (
                          <span className="rounded-full bg-[color-mix(in_oklab,var(--sidebar-foreground)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-sidebar-muted">
                            Pronto
                          </span>
                        )}
                        {!collapsed && typeof item.badge === "number" && item.badge > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--coral)] px-1.5 text-[10px] font-bold text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer: Configuración */}
      <div
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "p-2" : "p-3"
        )}
      >
        <Link
          href="/settings"
          title={collapsed ? "Configuración" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm transition-colors duration-200 ease-out",
            collapsed
              ? "justify-center px-2 py-2"
              : "gap-3 px-3 py-2",
            isActive("/settings", true) ? navActive : navIdle
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </Link>
      </div>
    </aside>
  );
}
