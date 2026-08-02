"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { searchWorkspace, type SearchHit } from "@/lib/actions/search";
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
 * CommandPalette (⌘K).
 *
 * Tres grupos fijos —acciones rápidas, navegación, atajos de Operaciones— más
 * los resultados de contenido, que se buscan en el servidor.
 *
 * Esa última parte estaba anotada como "(Futuro N3+)" mientras el placeholder
 * ya prometía "Buscar acciones, páginas, proyectos…". La paleta decía hacer algo
 * que no hacía: para una herramienta que se aprende una vez y se usa mil, esa
 * era la mitad del valor de ⌘K.
 *
 * Renderizado con `cmdk`. ↑↓ navega, Enter ejecuta, Esc cierra.
 */

/** Espera antes de consultar. Cubre la ráfaga de teclas de una palabra. */
const DEBOUNCE_MS = 180;

/**
 * Los resultados del servidor YA vienen filtrados, así que tienen que saltarse
 * el filtro local de cmdk — si no, "cotiz" no muestra una cotización llamada
 * "Pauta agosto" aunque el servidor la haya encontrado por el nombre del
 * cliente.
 */
const SERVER_HIT = "__server";

const KIND_ICON = {
  project: FolderKanban,
  task: CheckSquare,
  quote: Calculator,
} as const;

const KIND_LABEL = {
  project: "Proyecto",
  task: "Tarea",
  quote: "Cotización",
} as const;

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
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Inline adjustment — evita el ciclo extra de render que causaría un useEffect.
  // Cuando open pasa de true→false, reseteamos query en el mismo commit.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }

  // Búsqueda de contenido, con debounce y descarte de respuestas viejas.
  //
  // El descarte importa: escribiendo rápido salen varias consultas y no llegan
  // en orden. Sin el contador, la respuesta de "cot" puede aterrizar después de
  // la de "cotiza" y pisar resultados buenos con otros más viejos — se ve como
  // si la búsqueda ignorara las últimas letras.
  const runId = useRef(0);
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    const id = ++runId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchWorkspace(q);
        if (id === runId.current) setHits(found);
      } catch {
        // La búsqueda es una ayuda, no una operación: si falla, la paleta
        // sigue navegando. Un toast acá interrumpiría por algo que el usuario
        // no pidió explícitamente.
        if (id === runId.current) setHits([]);
      } finally {
        if (id === runId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-scrim p-4 pt-[18vh] animate-fade-in"
      onClick={onClose}
    >
      <Command
        label="Command Menu"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-md border border-rule-strong bg-surface-el shadow-elev-3 animate-slide-up"
        // El filter built-in de cmdk usa Sift4 fuzzy match.
        filter={(value, search, keywords) => {
          // Lo que ya filtró el servidor no se vuelve a filtrar acá.
          if (keywords?.includes(SERVER_HIT)) return 1;
          const haystack = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
          const needle = search.toLowerCase().trim();
          if (!needle) return 1;
          return haystack.includes(needle) ? 1 : 0;
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-faint" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder="Buscar proyectos, tareas, cotizaciones…"
            // foco-ok: la paleta se abre con el input ya enfocado y es el único
            // control; el diálogo entero hace de indicador de foco.
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          <kbd className="hidden rounded border border-rule bg-surface px-1.5 py-1 text-[12px] font-medium text-ink-faint sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[60vh] overflow-y-auto py-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-ink-soft">
            {searching ? "Buscando…" : `Sin resultados para "${query}"`}
          </Command.Empty>

          {hits.length > 0 && (
            <Command.Group
              heading="Resultados"
              className="px-2 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-ink-faint"
            >
              {hits.map((hit) => {
                const Icon = KIND_ICON[hit.kind];
                return (
                  <Command.Item
                    // `kind:id` y no el título: dos proyectos pueden llamarse
                    // igual, y con value repetido cmdk colapsa las filas.
                    key={`${hit.kind}:${hit.id}`}
                    value={`${hit.kind}:${hit.id}`}
                    keywords={[SERVER_HIT]}
                    onSelect={() => go(hit.href)}
                    className="group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft aria-selected:bg-accent-soft aria-selected:text-ink"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-ink-faint group-aria-selected:text-accent" />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {hit.title}
                    </span>
                    {hit.subtitle && (
                      <span className="flex-shrink-0 truncate text-[11px] text-ink-faint">
                        {hit.subtitle}
                      </span>
                    )}
                    <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {KIND_LABEL[hit.kind]}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {groups.map((group) => (
            <Command.Group
              key={group.id}
              heading={group.heading}
              className="px-2 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint"
            >
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={item.keywords?.split(" ") ?? []}
                    onSelect={item.action}
                    className="group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft aria-selected:bg-accent-soft aria-selected:text-ink"
                  >
                    {/* El estado vive en el <Command.Item> padre: `aria-selected`
                        sobre el icono nunca existe. Se lee desde el grupo. */}
                    <Icon className="h-4 w-4 flex-shrink-0 text-ink-faint group-aria-selected:text-accent" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-rule px-4 py-2 text-[12px] text-ink-faint">
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
