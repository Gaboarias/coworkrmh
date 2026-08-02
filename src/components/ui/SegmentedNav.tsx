"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * SegmentedNav — un grupo donde exactamente un elemento está activo.
 *
 * Cubría siete sitios que escribían el mismo par activo/inactivo a mano
 * (`bg-accent-soft text-ink` / `text-ink-soft hover:bg-accent-soft hover:text-ink`
 * aparecía ocho veces cada uno). Dos de esos archivos, ContentSubNav y
 * TasksViewSwitch, eran idénticos byte a byte salvo por su array de items.
 *
 * Dos formas:
 *   pill — sentence-case 13px, rounded-full. Cambiar de vista o de sección.
 *   chip — mono/mayúscula, rounded-md, activo invertido. Filtrar una lista.
 *          Se distingue del pill a propósito: filtrar y navegar no son lo mismo.
 *
 * La semántica sale de los datos, no de un prop: si los items traen `href` es
 * navegación (`<nav>` + `aria-current`), si no es un control de estado
 * (`role="group"` + `aria-pressed`). El caller no se puede equivocar.
 */

export interface SegmentedItem {
  /** Identidad estable. Con `href`, se puede omitir. */
  key?: string;
  label: string;
  icon?: LucideIcon;
  /** Presente = el grupo navega. Ausente = el grupo cambia estado local. */
  href?: string;
}

interface SegmentedNavProps {
  items: SegmentedItem[];
  /**
   * Key del item activo. Se puede omitir en grupos con `href`: en ese caso el
   * activo sale del pathname, que es lo que hacían todos los callers.
   */
  active?: string;
  onSelect?: (key: string) => void;
  tone?: "pill" | "chip";
  /** Nombre accesible del grupo. */
  label: string;
  className?: string;
}

const SHAPE = {
  pill: "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
  chip: "inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors",
} as const;

const STATE = {
  pill: {
    on: "bg-accent-soft text-ink",
    off: "text-ink-soft hover:bg-accent-soft hover:text-ink",
  },
  chip: {
    on: "bg-ink text-bg",
    off: "text-ink-soft hover:bg-accent-soft hover:text-ink",
  },
} as const;

const keyOf = (it: SegmentedItem) => it.key ?? it.href ?? it.label;

export function SegmentedNav({
  items,
  active,
  onSelect,
  tone = "pill",
  label,
  className,
}: SegmentedNavProps) {
  const pathname = usePathname();
  const navigates = items.some((it) => it.href);

  const isActive = (it: SegmentedItem) => {
    if (active !== undefined) return keyOf(it) === active;
    return it.href ? pathname.startsWith(it.href) : false;
  };

  const body = items.map((it) => {
    const on = isActive(it);
    const Icon = it.icon;
    const classes = cn(SHAPE[tone], on ? STATE[tone].on : STATE[tone].off);
    const inner = (
      <>
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
        {it.label}
      </>
    );

    return it.href ? (
      <Link
        key={keyOf(it)}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={classes}
      >
        {inner}
      </Link>
    ) : (
      <button
        key={keyOf(it)}
        type="button"
        onClick={() => onSelect?.(keyOf(it))}
        aria-pressed={on}
        className={classes}
      >
        {inner}
      </button>
    );
  });

  const shared = cn("flex items-center gap-2", className);

  return navigates ? (
    <nav aria-label={label} className={shared}>
      {body}
    </nav>
  ) : (
    <div role="group" aria-label={label} className={shared}>
      {body}
    </div>
  );
}
