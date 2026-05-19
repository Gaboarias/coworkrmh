"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function AdminNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Usuarios", exact: true },
    { href: "/admin/negocios", label: "Negocios", exact: false },
  ];
  function active(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
            active(t.href, t.exact)
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
