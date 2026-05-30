"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Briefcase,
  Settings,
  Shield,
  Plus,
  FileText,
  StickyNote,
  Calculator,
  Search,
} from "lucide-react";

/**
 * CommandPalette (⌘K) — Sunset Aurora · N3.
 *
 * Dialog modal con search-as-you-type. Tres grupos por defecto:
 *   1. Acciones rápidas — crear proyecto/tarea/nota/cotización
 *   2. Navegación — ir a Dashboard/Proyectos/Operaciones/Admin/etc
 *   3. (Futuro N3+) Buscar proyectos/tareas/notas con fetch dinámico
 *
 * Renderizado con `cmdk` (Radix-grade primitivo). Filtrado automático
 * por substring fuzzy. ↑↓ navega, Enter ejecuta, Esc cierra.
 */

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
  action: () => void;
}

interface CommandGroup {
  id: string;
  heading: string;
  items: CommandItem[];
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Reset query cuando se cierra (siguiente apertura empieza limpio)
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Esc para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const groups: CommandGroup[] = [
    {
      id: "actions",
      heading: "Acciones rápidas",
      items: [
        {
          id: "new-project",
          label: "Nuevo proyecto",
          icon: Plus,
          keywords: "crear proyecto add",
          action: () => go("/projects/new"),
        },
        {
          id: "new-quote",
          label: "Nueva cotización",
          icon: Calculator,
          keywords: "cotizar quote nueva crear",
          action: () => go("/operations/cotizador/nuevo"),
        },
        {
          id: "go-tasks",
          label: "Mis tareas",
          icon: CheckSquare,
          keywords: "tareas pendientes mis tasks",
          action: () => go("/my-tasks"),
        },
      ],
    },
    {
      id: "nav",
      heading: "Navegación",
      items: [
        {
          id: "dashboard",
          label: "Resumen",
          icon: LayoutDashboard,
          keywords: "dashboard home inicio",
          action: () => go("/dashboard"),
        },
        {
          id: "projects",
          label: "Proyectos",
          icon: FolderKanban,
          keywords: "projects proyectos",
          action: () => go("/projects"),
        },
        {
          id: "operations",
          label: "Operaciones",
          icon: Briefcase,
          keywords: "operations erp catalogo cotizador ventas gastos equipo",
          action: () => go("/operations"),
        },
        {
          id: "calendar",
          label: "Calendario",
          icon: Calendar,
          keywords: "calendar agenda",
          action: () => go("/calendar"),
        },
        {
          id: "reports",
          label: "Reportes",
          icon: FileText,
          keywords: "reports analytics analytics graficos kpis",
          action: () => go("/reports"),
        },
        {
          id: "admin",
          label: "Administración",
          icon: Shield,
          keywords: "admin gestion miembros entornos roles",
          action: () => go("/admin"),
        },
        {
          id: "settings",
          label: "Configuración",
          icon: Settings,
          keywords: "settings ajustes perfil",
          action: () => go("/settings"),
        },
      ],
    },
    {
      id: "ops-shortcuts",
      heading: "Operaciones",
      items: [
        {
          id: "ops-catalogo",
          label: "Catálogo",
          icon: FileText,
          keywords: "catalogo productos catalog",
          action: () => go("/operations/catalogo"),
        },
        {
          id: "ops-cotizador",
          label: "Cotizador",
          icon: Calculator,
          keywords: "cotizar quotes cotizador",
          action: () => go("/operations/cotizador"),
        },
        {
          id: "ops-ventas",
          label: "Ventas",
          icon: StickyNote,
          keywords: "ventas sales registro",
          action: () => go("/operations/ventas"),
        },
        {
          id: "ops-gastos",
          label: "Gastos",
          icon: StickyNote,
          keywords: "gastos expenses inversion fijos",
          action: () => go("/operations/gastos"),
        },
        {
          id: "ops-equipo",
          label: "Equipo",
          icon: StickyNote,
          keywords: "equipo team",
          action: () => go("/operations/equipo"),
        },
      ],
    },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[18vh] backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <Command
        label="Command Menu"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-el shadow-elev-3 backdrop-blur-2xl backdrop-saturate-150 animate-slide-up"
        // El filter built-in de cmdk usa Sift4 fuzzy match.
        filter={(value, search, keywords) => {
          const haystack = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
          const needle = search.toLowerCase().trim();
          if (!needle) return 1;
          return haystack.includes(needle) ? 1 : 0;
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder="Buscar acciones, páginas, proyectos..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-tertiary outline-none"
          />
          <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[12px] font-medium text-text-tertiary sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[60vh] overflow-y-auto py-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-text-muted">
            Sin resultados para &quot;{query}&quot;
          </Command.Empty>

          {groups.map((group) => (
            <Command.Group
              key={group.id}
              heading={group.heading}
              className="px-2 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-tertiary"
            >
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={item.keywords?.split(" ") ?? []}
                    onSelect={item.action}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted aria-selected:bg-[color-mix(in_oklab,var(--coral)_18%,transparent)] aria-selected:text-text"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-text-tertiary aria-selected:text-coral" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[12px] text-text-tertiary">
          <span>
            <kbd className="rounded bg-surface px-1">↑↓</kbd> navegar ·{" "}
            <kbd className="rounded bg-surface px-1">Enter</kbd> seleccionar
          </span>
          <span>
            <kbd className="rounded bg-surface px-1">⌘K</kbd> abrir/cerrar
          </span>
        </div>
      </Command>
    </div>
  );
}
