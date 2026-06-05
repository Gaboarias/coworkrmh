import type { ProjectStatus } from "@/lib/types";
import type { BadgeProps } from "@/components/ui/Badge";

/**
 * Pipeline de proyectos — etapas en orden de business flow:
 *   1. Prospecto → lead temprano, sin compromiso
 *   2. Primer Contrato → en negociación / propuesta
 *   3. Firmado → ganado, esperando arrancar
 *   4. Operaciones → producción activa
 *   5. Retomar → pausa con intención de reactivar
 *   6. Descartado → perdido / cancelado
 *   + Archivado (oculto del panel principal, no es etapa de pipeline)
 *
 * Los keys legacy (active/paused/in_review/stopped/completed) mapean a
 * "Prospecto" como fallback visual hasta que el endpoint de migración
 * los reescriba en DB.
 */
export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  prospecto: { label: "Prospecto", variant: "neutral" },
  primer_contrato: { label: "Primer Contrato", variant: "info" },
  firmado: { label: "Firmado", variant: "warning" },
  operaciones: { label: "Operaciones", variant: "success" },
  retomar: { label: "Retomar", variant: "warning" },
  descartado: { label: "Descartado", variant: "danger" },
  archived: { label: "Archivado", variant: "neutral" },
  // Legacy fallbacks — sólo se muestran si la DB todavía tiene estos valores.
  // El endpoint de migración los reescribe a 'prospecto'.
  active: { label: "Prospecto", variant: "neutral" },
  paused: { label: "Prospecto", variant: "neutral" },
  in_review: { label: "Prospecto", variant: "neutral" },
  stopped: { label: "Prospecto", variant: "neutral" },
  completed: { label: "Prospecto", variant: "neutral" },
};

// Orden visible en selectores / tabs. Archived va aparte (botón archivar).
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "prospecto",
  "primer_contrato",
  "firmado",
  "operaciones",
  "retomar",
  "descartado",
];

/** Set para chequeos rápidos: "¿es una etapa del pipeline (no archived)?" */
export const PIPELINE_STATUSES = new Set<ProjectStatus>([
  "prospecto",
  "primer_contrato",
  "firmado",
  "operaciones",
  "retomar",
  "descartado",
]);

/** Set para chequeos de "actividad" — todo lo que no sea descartado/archivado. */
export const ACTIVE_PIPELINE_STATUSES = new Set<ProjectStatus>([
  "prospecto",
  "primer_contrato",
  "firmado",
  "operaciones",
  "retomar",
]);
