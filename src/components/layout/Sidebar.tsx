"use client";

import { useEffect } from "react";
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
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/lib/hooks/useUser";
import { EntornoSwitcher, type WsData } from "@/components/layout/EntornoSwitcher";
import { useSidebarState } from "./SidebarStateContext";

/**
 * Sidebar (Edition 04).
 *
 * Cambios visuales vs Sunset Aurora:
 * - Brand: "Pistachio" + tag mono small-caps "RMH STUDIO".
 * - Section headers en mono small-caps (eyebrow style, no bold caps mate).
 * - Active state: font-weight bold + bg-accent-soft + 2px left accent bar
 *   en --project-color (heredado del project layout cuando aplique).
 * - Sin glass, sin backdrop-blur — Edition 04 vive en surfaces sólidas.
 * - Width: 200px expandido (un poco más que el viejo 240, para que el
 *   typography aire respire), 52px collapsed.
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
      { href: "/clients", label: "Clientes", icon: Building2, adminOnly: true },
    ],
  },
  {
    id: "analytics",
    label: "Análisis",
    items: [
      { href: "/reports", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    ],
  },
];

export function Sidebar({ wsData }: { wsData: WsData }) {
  const pathname = usePathname();
  const { profile } = useUser();
  const isAdmin = profile?.role === "admin";

  // Estado collapsed levantado a context — compartido con SidebarToggle
  // en el topbar y con keyboard shortcut ⌘B.
  const {
    collapsed: collapsedDesktop,
    toggle,
    hydrated,
    isMobile,
    mobileOpen,
    setMobileOpen,
  } = useSidebarState();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  // Close mobile drawer cuando navego a otra ruta (auto-close UX).
  // Llamar setMobileOpen(false) en desktop es no-op.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Mobile + cerrado: no renderiza nada (drawer oculto).
  if (isMobile && !mobileOpen) return null;

  // En mobile abierto, ignoramos el flag de collapsed (siempre expandido
  // en el overlay drawer). En desktop respetamos el valor del context.
  const collapsed = isMobile ? false : collapsedDesktop;
  const w = isMobile ? "w-[260px]" : collapsed ? "w-[56px]" : "w-[228px]";

  // Wrap responsive — mobile vive como overlay fijo con backdrop, desktop
  // vive como columna lateral del flex parent (AppShell).
  const asideClasses = isMobile
    ? "fixed left-0 top-0 z-50 h-full shadow-xl"
    : "h-full transition-[width] duration-200 ease-out";

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "flex flex-col border-r border-rule bg-bg",
          asideClasses,
          w,
          !hydrated && "opacity-0",
          hydrated && "opacity-100"
        )}
      >
      {/* Brand block */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-rule",
          collapsed ? "h-[64px] justify-center px-2" : "h-[64px] px-5"
        )}
      >
        {/* Mark — square con P, color = project-color (default ink) */}
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[5px] bg-ink text-[16px] font-bold text-bg"
          style={{ letterSpacing: "-0.03em" }}
        >
          P
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-none tracking-[-0.02em] text-ink">
              Pistachio
            </p>
            <p className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.2em] text-ink-faint">
              RMH studio
            </p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Colapsar sidebar"
            title="Colapsar"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-accent-soft hover:text-ink"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expandir sidebar"
          title="Expandir"
          className="mx-auto mt-2 flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-accent-soft hover:text-ink"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Entorno (collapsed lo oculta) */}
      {!collapsed && <EntornoSwitcher initialData={wsData} />}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (it) => !it.adminOnly || isAdmin
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.id} className="mb-6 last:mb-0">
              {!collapsed && (
                <div className="mb-2 px-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
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
                          "group relative flex items-center rounded-md transition-colors duration-150 ease-out",
                          collapsed
                            ? "h-8 w-8 justify-center mx-auto"
                            : "gap-2.5 px-2 py-1.5",
                          active
                            ? "bg-accent-soft text-ink"
                            : "text-ink-soft hover:bg-accent-soft hover:text-ink",
                          isPlaceholder && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {/* Active accent bar (left), usa project-color */}
                        {active && !collapsed && (
                          <span
                            aria-hidden
                            className="absolute -left-3 top-1.5 bottom-1.5 w-[2px] rounded-full"
                            style={{ background: "var(--project-color)" }}
                          />
                        )}
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                        {!collapsed && (
                          <span
                            className={cn(
                              "flex-1 truncate text-[15px] leading-none",
                              active ? "font-bold" : "font-medium"
                            )}
                          >
                            {item.label}
                          </span>
                        )}
                        {!collapsed && item.badge === "soon" && (
                          <span className="rounded-sm bg-accent-soft px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
                            Pronto
                          </span>
                        )}
                        {!collapsed &&
                          typeof item.badge === "number" &&
                          item.badge > 0 && (
                            <span className="pill pill-urgent">
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

      {/* Footer */}
      <div
        className={cn(
          "border-t border-rule",
          collapsed ? "p-2" : "px-3 py-3"
        )}
      >
        <Link
          href="/settings"
          title={collapsed ? "Configuración" : undefined}
          className={cn(
            "flex items-center rounded-md transition-colors duration-150 ease-out",
            collapsed
              ? "h-8 w-8 mx-auto justify-center"
              : "gap-2.5 px-2 py-1.5",
            isActive("/settings", true)
              ? "bg-accent-soft text-ink"
              : "text-ink-soft hover:bg-accent-soft hover:text-ink"
          )}
        >
          <Settings className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
          {!collapsed && (
            <span className="text-[15px] font-medium leading-none">
              Configuración
            </span>
          )}
        </Link>
      </div>
      </aside>
    </>
  );
}
