"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * TabNav (Edition 04).
 *
 * - Labels en weight 500 normal, 700 cuando active.
 * - Active state: subrayado 2px en var(--project-color) — heredado del
 *   project layout cuando aplique. En operations o pages neutrales,
 *   --project-color resuelve a --accent que es ink/foreground, así
 *   que el subrayado se ve oscuro.
 * - Más generous gap (24px) que el viejo (1px).
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
        "mb-6 flex flex-wrap items-center gap-6 border-b border-rule",
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
              "-mb-px border-b-2 pb-3 text-[13px] transition-colors duration-150 ease-out",
              active
                ? "font-bold text-ink"
                : "border-transparent font-medium text-ink-soft hover:text-ink"
            )}
            style={
              active
                ? { borderBottomColor: "var(--project-color)" }
                : undefined
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
