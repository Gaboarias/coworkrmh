"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * TabNav — barra de tabs horizontal compartida.
 *
 * Usado por:
 * - OperationsNav (Resumen/Catálogo/Cotizador/Ventas/Gastos/Equipo)
 * - Project tabs (Tareas/Documentos/Notas/Changelog/Config)
 *
 * Detecta el tab activo via usePathname (exact si el tab tiene `exact: true`,
 * sino prefix match con startsWith).
 */
export interface TabItem {
  href: string;
  label: string;
  exact?: boolean;
}

export function TabNav({
  tabs,
  className,
}: {
  tabs: TabItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (t: TabItem) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href);

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-1 border-b border-border",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
