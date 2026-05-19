"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/operations", label: "Resumen", exact: true },
  { href: "/operations/catalogo", label: "Catálogo", exact: false },
  { href: "/operations/cotizador", label: "Cotizador", exact: false },
  { href: "/operations/ventas", label: "Ventas", exact: false },
  { href: "/operations/gastos", label: "Gastos", exact: false },
  { href: "/operations/equipo", label: "Equipo", exact: false },
];

export const OperationsNav = () => {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
            isActive(t.href, t.exact)
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
};
