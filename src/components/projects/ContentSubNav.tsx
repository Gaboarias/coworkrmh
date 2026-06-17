"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Sub-nav del área "Contenido" del proyecto: Archivos (documentos) | Notas.
 * Unifica las dos secciones bajo una sola pestaña sin tocar sus modelos de
 * datos ni el editor colaborativo — solo presentación.
 */
export function ContentSubNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const items = [
    {
      href: `/projects/${projectId}/documents`,
      label: "Archivos",
      icon: FileText,
    },
    { href: `/projects/${projectId}/notes`, label: "Notas", icon: StickyNote },
  ];

  return (
    <div className="mb-6 flex items-center gap-1.5">
      {items.map((it) => {
        const active = pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent-soft text-ink"
                : "text-ink-soft hover:bg-accent-soft hover:text-ink"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
