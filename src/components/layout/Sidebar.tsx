"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/lib/hooks/useUser";
import { EntornoSwitcher, type WsData } from "@/components/layout/EntornoSwitcher";
import { useSidebarState } from "./SidebarStateContext";
import { hasFeature, type Tier } from "@/lib/entitlements";
import { IconButton } from "@/components/ui/IconButton";
import {
  TERRITORIES,
  SETTINGS_ENTRY,
  territoryOf,
} from "@/lib/constants/navigation";

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

/**
 * Los cuatro territorios y sus rutas viven en @/lib/constants/navigation.
 *
 * Estaban acá adentro, y este archivo es `"use client"`: cualquier Server
 * Component que quisiera saber en qué territorio está parado habría recibido
 * una referencia de cliente en vez de los datos. Es el mismo bug que publicó
 * un `[object Object]` en el encabezado de Operaciones.
 */

/**
 * Receta compartida por los items de navegación y por el enlace de
 * configuración del pie: eran la misma cadena escrita dos veces, y ya habían
 * divergido en el orden de clases del estado colapsado.
 */
const navItemClass = (collapsed: boolean, active: boolean) =>
  cn(
    "flex items-center rounded-md transition-colors duration-150 ease-out",
    collapsed ? "h-8 w-8 justify-center mx-auto" : "gap-3 px-2 py-2",
    active
      ? "bg-accent-soft text-ink"
      : "text-ink-soft hover:bg-accent-soft hover:text-ink"
  );

export function Sidebar({ wsData }: { wsData: WsData }) {
  const pathname = usePathname();
  const { profile } = useUser();
  const isAdmin = profile?.role === "admin";

  // Tier del entorno activo → gating de features premium. Sin entorno → basic.
  const activeTier: Tier =
    wsData.workspaces.find((w) => w.id === wsData.activeId)?.tier ?? "basic";

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

  // En qué territorio está parada la persona. Se resuelve por prefijo más
  // largo (ver territoryOf), no por el ítem activo: /projects/<id>/notas no es
  // ítem de nav y aun así es Trabajo.
  const activeTerritory = territoryOf(pathname);

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
          className="fixed inset-0 z-40 bg-scrim-soft"
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
          "flex items-center gap-3 border-b border-rule",
          collapsed ? "h-[64px] justify-center px-2" : "h-[64px] px-5"
        )}
      >
        {/* Mark — square con P, color = project-color (default ink) */}
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[5px] bg-ink text-[14px] font-bold text-bg"
          style={{ letterSpacing: "-0.03em" }}
        >
          P
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-none tracking-[-0.02em] text-ink">
              Pistachio
            </p>
            <p className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.2em] text-ink-faint">
              RMH studio
            </p>
          </div>
        )}
        {!collapsed && (
          <IconButton
            size="sm"
            tone="faint"
            onClick={toggle}
            label="Colapsar sidebar"
            title="Colapsar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </IconButton>
        )}
      </div>

      {collapsed && (
        <IconButton
          size="sm"
          tone="faint"
          onClick={toggle}
          label="Expandir sidebar"
          title="Expandir"
          className="mx-auto mt-2"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </IconButton>
      )}

      {/* Entorno (collapsed lo oculta) */}
      {!collapsed && <EntornoSwitcher initialData={wsData} />}

      {/* Navegación — cuatro territorios separados por regla, no por aire.
          El margen solo no alcanzaba: a 24px de separación entre grupos, la
          lista se leía como una sola columna de siete cosas. Y al colapsar, el
          rótulo desaparece y no quedaba NINGUNA señal de que hubiera grupos —
          la regla es lo único que sobrevive a 56px de ancho. */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {TERRITORIES.map((territory) => {
          const visibleItems = territory.items.filter(
            (it) =>
              (!it.adminOnly || isAdmin) &&
              (!it.feature || hasFeature(activeTier, it.feature))
          );
          if (visibleItems.length === 0) return null;
          const here = activeTerritory?.id === territory.id;
          return (
            <div
              key={territory.id}
              className={cn(
                "border-t border-rule pt-4",
                collapsed ? "mt-4" : "mt-5",
                // El primero no lleva regla arriba: ya está el borde del
                // bloque de entorno.
                "first:mt-0 first:border-t-0 first:pt-0"
              )}
            >
              {!collapsed && (
                <div
                  className={cn(
                    "mb-2 flex items-baseline gap-2 px-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-colors",
                    // El territorio donde estás parado se enciende. Es la
                    // diferencia entre cuatro rótulos decorativos y saber en
                    // cuál de los cuatro estás sin leer el ítem activo.
                    here ? "text-ink" : "text-ink-faint"
                  )}
                >
                  {here && (
                    <span
                      aria-hidden
                      className="h-1 w-1 flex-shrink-0 rounded-full bg-accent"
                    />
                  )}
                  {territory.label}
                </div>
              )}
              <ul className="space-y-1">
                {/* Había una rama de `badge` acá — un pill numérico y una
                    etiqueta "Pronto" para items deshabilitados. Ningún item la
                    usó nunca, así que era código que no se ejecutó jamás. Se
                    fue con el tipo: los contadores de no leídas los muestra
                    NotificationsBell, no el sidebar. */}
                {visibleItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative",
                          navItemClass(collapsed, active)
                        )}
                      >
                        {/* Barra de acento a la izquierda, en project-color */}
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
                              "flex-1 truncate text-[13px] leading-none",
                              active ? "font-bold" : "font-medium"
                            )}
                          >
                            {item.label}
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
          href={SETTINGS_ENTRY.href}
          title={collapsed ? SETTINGS_ENTRY.label : undefined}
          className={navItemClass(
            collapsed,
            isActive(SETTINGS_ENTRY.href, SETTINGS_ENTRY.exact)
          )}
        >
          <SETTINGS_ENTRY.icon
            className="h-3.5 w-3.5 flex-shrink-0"
            strokeWidth={1.75}
          />
          {!collapsed && (
            <span className="text-[13px] font-medium leading-none">
              {SETTINGS_ENTRY.label}
            </span>
          )}
        </Link>
      </div>
      </aside>
    </>
  );
}
