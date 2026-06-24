"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProjectName } from "@/lib/actions/projects";
import { getNoteTitle } from "@/lib/actions/notes";
import { getQuoteTitle } from "@/lib/actions/erpQuotes";

// Cache módulo-level: href dinámico → label real resuelto. Evita refetch al
// navegar (mismo proyecto/nota/cotización).
const labelCache = new Map<string, string>();

/**
 * Breadcrumbs auto-generados a partir del pathname.
 *
 * Map de rutas conocidas (top-level + sub-rutas) → label legible. Para
 * segmentos [id] dinámicos (proyectos, cotizaciones, notas) muestra "…"
 * o el ID corto — no hace lookup a DB porque ese contexto no está
 * disponible client-side acá. Las páginas que quieran un breadcrumb
 * rico pueden pasar `overrideLast` con el nombre real del recurso.
 *
 * Ejemplos:
 *   /dashboard                                  → Resumen
 *   /projects                                   → Proyectos
 *   /projects/abc-123                           → Proyectos › abc-123
 *   /projects/abc-123/notes/xyz                 → Proyectos › abc-123 › Notas › xyz
 *   /operations/cotizador/nuevo                 → Operaciones › Cotizador › Nuevo
 *   /operations/cotizador/id-789                → Operaciones › Cotizador › id-789
 */

/** Map de segmentos estáticos → label legible. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Resumen",
  projects: "Proyectos",
  "my-tasks": "Mis tareas",
  calendar: "Calendario",
  operations: "Operaciones",
  catalogo: "Catálogo",
  cotizador: "Cotizador",
  ventas: "Ventas",
  gastos: "Gastos",
  equipo: "Equipo",
  documents: "Documentos",
  notes: "Notas",
  changelog: "Historial",
  settings: "Configuración",
  admin: "Admin",
  reports: "Reportes",
  new: "Nuevo",
  nuevo: "Nuevo",
};

/** Rutas que NO se muestran en breadcrumbs (públicas/auth). */
const HIDDEN_ROUTES = new Set(["/login", "/forgot-password", "/"]);

interface Segment {
  href: string;
  label: string;
  isLast: boolean;
}

function buildSegments(pathname: string): Segment[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [];
  const segments: Segment[] = [];
  let acc = "";
  parts.forEach((part, idx) => {
    acc += `/${part}`;
    const isLast = idx === parts.length - 1;
    let label = SEGMENT_LABELS[part];
    if (!label) {
      // Segmento dinámico (UUID/slug). Mostrar versión corta.
      label = part.length > 12 ? part.slice(0, 8) + "…" : part;
    }
    segments.push({ href: acc, label, isLast });
  });
  return segments;
}

export interface BreadcrumbsProps {
  /** Override del label del último segmento (cuando la página tiene el nombre real). */
  overrideLast?: string;
  className?: string;
}

export function Breadcrumbs({ overrideLast, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Segmentos dinámicos (UUID) en la URL → cómo resolver su label real. El
  // breadcrumb solo tiene el ID, así que pedimos el nombre/título al server.
  const parts = pathname.split("/").filter(Boolean);
  const targets: { href: string; resolve: () => Promise<string | null> }[] = [];
  if (parts[0] === "projects" && parts[1] && !SEGMENT_LABELS[parts[1]]) {
    const pid = parts[1];
    targets.push({ href: `/projects/${pid}`, resolve: () => getProjectName(pid) });
    if (parts[2] === "notes" && parts[3] && !SEGMENT_LABELS[parts[3]]) {
      const nid = parts[3];
      targets.push({
        href: `/projects/${pid}/notes/${nid}`,
        resolve: () => getNoteTitle(nid),
      });
    }
  } else if (
    parts[0] === "operations" &&
    parts[1] === "cotizador" &&
    parts[2] &&
    !SEGMENT_LABELS[parts[2]]
  ) {
    const qid = parts[2];
    targets.push({
      href: `/operations/cotizador/${qid}`,
      resolve: () => getQuoteTitle(qid),
    });
  }

  const targetKey = targets.map((t) => t.href).join("|");
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const t of targets) {
      const c = labelCache.get(t.href);
      if (c) seed[t.href] = c;
    }
    return seed;
  });

  useEffect(() => {
    let alive = true;
    for (const t of targets) {
      const cached = labelCache.get(t.href);
      if (cached) {
        setLabels((prev) => ({ ...prev, [t.href]: cached }));
        continue;
      }
      t.resolve()
        .then((label) => {
          if (!alive || !label) return;
          labelCache.set(t.href, label);
          setLabels((prev) => ({ ...prev, [t.href]: label }));
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  if (HIDDEN_ROUTES.has(pathname)) return null;
  const segments = buildSegments(pathname);
  if (segments.length === 0) return null;

  // Reemplazar segmentos dinámicos (UUID) por sus labels resueltos.
  for (const seg of segments) {
    if (labels[seg.href]) seg.label = labels[seg.href];
  }

  // Aplicar override al último si viene
  const last = segments[segments.length - 1];
  if (overrideLast && last) last.label = overrideLast;

  // En mobile (< sm 640px) mostrar SOLO el último segmento (current page)
  // para que no desborde. Desktop muestra el path completo.
  // Implementación: el container del Topbar ya hace flex-1 min-w-0, acá
  // controlamos qué partes son visibles según breakpoint.
  return (
    <nav
      aria-label="Breadcrumb"
      className={
        "flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:text-[12px] " +
        (className ?? "")
      }
    >
      {/* Slash inicial — sólo desktop */}
      <span aria-hidden className="hidden flex-shrink-0 text-ink-faint sm:inline">
        /
      </span>
      {segments.map((s, i) => {
        const isLast = s.isLast;
        // Segmentos intermedios sólo se ven en sm+ (≥640px).
        // El último se ve siempre.
        return (
          <span
            key={s.href}
            className={
              "flex min-w-0 items-center gap-1.5 " +
              (isLast ? "" : "hidden sm:flex flex-shrink-0")
            }
          >
            {i > 0 && (
              <span aria-hidden className="hidden flex-shrink-0 text-ink-faint sm:inline">
                /
              </span>
            )}
            {isLast ? (
              <span
                className="min-w-0 truncate text-ink"
                aria-current="page"
              >
                {s.label}
              </span>
            ) : (
              <Link
                href={s.href}
                className="truncate transition-colors hover:text-ink"
              >
                {s.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
