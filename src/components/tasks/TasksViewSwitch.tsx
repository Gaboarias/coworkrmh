"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Switch de vista del área de tareas: Lista (/my-tasks) | Calendario (/calendar).
 * Unifica ambas como dos vistas de una misma sección sin fusionar datos —
 * Calendario sale del sidebar y se accede desde acá.
 */
export function TasksViewSwitch() {
  const pathname = usePathname();
  const items = [
    { href: "/my-tasks", label: "Lista", icon: List },
    { href: "/calendar", label: "Calendario", icon: CalendarDays },
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
