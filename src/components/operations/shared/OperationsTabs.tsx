"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function OperationsTabs({ bucketId }: { bucketId: string }) {
  const pathname = usePathname();
  const base = `/operations/${bucketId}`;
  const tabs = [
    { href: `${base}/products`, label: "Catálogo" },
    { href: `${base}/quotes`, label: "Cotizador" },
    { href: `${base}/sales`, label: "Ventas" },
    { href: `${base}/expenses`, label: "Gastos" },
    { href: `${base}/clients`, label: "Clientes" },
    { href: `${base}/team`, label: "Equipo" },
  ];

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
            active(t.href)
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
