"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateCR, todayYmdCR } from "@/lib/utils/datetime";
import type { ProjectStatus } from "@/lib/types";

/**
 * /projects — Explorer con tabs por status + specimens grandes.
 *
 * Layout:
 *   1. Status tabs (mono small-caps): TODOS · ACTIVO · EN PAUSA · …
 *      Cada uno con su count. El activo lleva un underline grueso del
 *      color status (urgent / done / info / warn / ink).
 *
 *   2. Specimens — un proyecto por bloque a ancho completo:
 *      - Hanging number (01, 02, …) + bucket eyebrow + status pill
 *      - Mega-título Satoshi bold ~64-80px, color drop-line
 *      - Description italic ink-soft
 *      - Strip de 3 stats grandes: tareas activas, % completo, días
 *      - Hairline rule separator entre specimens
 *      - Color del proyecto como acento sutil (left border + bucket dot)
 *
 *   3. CTA "Ver detalle →" en cada specimen, link al proyecto.
 *
 * Reveal: stagger animation-delay por index para que entren en cascada.
 */

export interface ProjectSpecimen {
  index: number;
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: ProjectStatus;
  bucketName: string | null;
  bucketColor: string | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  totalTasks: number;
  doneTasks: number;
  activeTasks: number;
}

type StatusFilter = "all" | ProjectStatus;

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Todos",
  prospecto: "Prospecto",
  primer_contrato: "Primer Contrato",
  firmado: "Firmado",
  operaciones: "Operaciones",
  retomar: "Retomar",
  descartado: "Descartado",
  archived: "Archivado",
  // Legacy — sólo aparecen si la DB tiene data sin migrar.
  active: "Prospecto",
  paused: "Prospecto",
  in_review: "Prospecto",
  stopped: "Prospecto",
  completed: "Prospecto",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  prospecto: "var(--ink-soft)",
  primer_contrato: "var(--info)",
  firmado: "var(--warn)",
  operaciones: "var(--done)",
  retomar: "var(--ink-faint)",
  descartado: "var(--urgent)",
  archived: "var(--ink-faint)",
  // Legacy fallback (sin migrar)
  active: "var(--ink-soft)",
  paused: "var(--ink-soft)",
  in_review: "var(--ink-soft)",
  stopped: "var(--ink-soft)",
  completed: "var(--ink-soft)",
};

const STATUS_ORDER: StatusFilter[] = [
  "all",
  "prospecto",
  "primer_contrato",
  "firmado",
  "operaciones",
  "retomar",
  "descartado",
];

const DEFAULT_PROJECT_COLOR = "var(--ink)";

export function ProjectsExplorer({
  specimens,
}: {
  specimens: ProjectSpecimen[];
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: specimens.length,
      prospecto: 0,
      primer_contrato: 0,
      firmado: 0,
      operaciones: 0,
      retomar: 0,
      descartado: 0,
      archived: 0,
      // Legacy — sin migrar. Cuento bajo prospecto para que no se pierdan
      // visualmente hasta que corras el migrate endpoint.
      active: 0,
      paused: 0,
      in_review: 0,
      stopped: 0,
      completed: 0,
    };
    for (const s of specimens) {
      const isLegacy =
        s.status === "active" ||
        s.status === "paused" ||
        s.status === "in_review" ||
        s.status === "stopped" ||
        s.status === "completed";
      c[isLegacy ? "prospecto" : s.status]++;
    }
    return c;
  }, [specimens]);

  const visible = useMemo(() => {
    if (filter === "all") return specimens;
    if (filter === "prospecto") {
      // Incluir legacy statuses (sin migrar) bajo prospecto.
      return specimens.filter(
        (s) =>
          s.status === "prospecto" ||
          s.status === "active" ||
          s.status === "paused" ||
          s.status === "in_review" ||
          s.status === "stopped" ||
          s.status === "completed"
      );
    }
    return specimens.filter((s) => s.status === filter);
  }, [specimens, filter]);

  return (
    <div className="mt-2 space-y-12">
      {/* ── Status tabs ─────────────────────────────────────── */}
      <nav
        aria-label="Filtrar por etapa"
        className="-mx-1 flex flex-wrap items-end gap-x-1 gap-y-2"
      >
        {STATUS_ORDER.map((s) => {
          const isActive = filter === s;
          const accent =
            s === "all" ? "var(--ink)" : STATUS_COLOR[s as ProjectStatus];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={isActive}
              className={cn(
                "group/tab relative flex items-baseline gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                isActive
                  ? "text-ink"
                  : "text-ink-faint hover:text-ink-soft"
              )}
            >
              <span className="font-bold">{STATUS_LABEL[s]}</span>
              <span
                className={cn(
                  "tabular-nums",
                  isActive ? "text-ink-soft" : "text-ink-faint"
                )}
              >
                {counts[s]}
              </span>
              {/* Hairline gruesa abajo del activo */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 -bottom-px h-[3px] origin-left transition-transform duration-300 ease-out",
                  isActive ? "scale-x-100" : "scale-x-0"
                )}
                style={{ backgroundColor: accent }}
              />
            </button>
          );
        })}
      </nav>

      {/* ── Specimens ────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm italic text-ink-faint">
          No hay proyectos en esta etapa.
        </p>
      ) : (
        <div className="divide-y divide-rule">
          {visible.map((s, i) => (
            <ProjectSpecimenBlock key={s.id} s={s} order={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Specimen ──────────────────────────────────────────────────────

function ProjectSpecimenBlock({
  s,
  order,
}: {
  s: ProjectSpecimen;
  order: number;
}) {
  const accent = s.color ?? DEFAULT_PROJECT_COLOR;
  const statusColor = STATUS_COLOR[s.status];
  const percentComplete =
    s.totalTasks > 0 ? Math.round((s.doneTasks / s.totalTasks) * 100) : null;

  // Días restantes — calculado en CR para que no se desfase a UTC.
  let daysRemaining: number | null = null;
  let isOverdue = false;
  const endRef = s.endDate ?? s.dueDate;
  if (endRef) {
    const today = todayYmdCR();
    // YYYY-MM-DD lexicographic comparison gives a sign — fine for ordering,
    // but for distance we need ms. Use noon-anchored Date in CR.
    const endMs = new Date(endRef + "T12:00:00Z").getTime();
    const todayMs = new Date(today + "T12:00:00Z").getTime();
    const diff = Math.round((endMs - todayMs) / 86_400_000);
    daysRemaining = diff;
    // Overdue solo aplica a etapas operativas — no a retomar (pausa
    // intencional) ni a descartado/archived (terminal).
    const operationalStatuses: ProjectStatus[] = [
      "prospecto",
      "primer_contrato",
      "firmado",
      "operaciones",
      "active",
      "paused",
      "in_review",
    ];
    isOverdue = diff < 0 && operationalStatuses.includes(s.status);
  }

  return (
    <article
      style={{
        animationDelay: `${Math.min(order, 8) * 60}ms`,
      }}
      className="group/specimen relative animate-fade-in py-14 first:pt-6 last:pb-6 md:py-20"
    >
      {/* Color band — left edge accent, sutil pero presente */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 hidden h-[60%] w-[3px] -translate-y-1/2 md:block"
        style={{ backgroundColor: accent }}
      />

      <div className="md:pl-8">
        {/* Eyebrow row: hanging number + bucket + status pill */}
        <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="font-mono text-[14px] font-bold tabular-nums text-ink-faint">
            {String(s.index).padStart(2, "0")}
          </span>
          {s.bucketName && (
            <span className="inline-flex items-baseline gap-2">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 self-center rounded-full"
                style={{
                  backgroundColor: s.bucketColor ?? "var(--ink-faint)",
                }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                {s.bucketName}
              </span>
            </span>
          )}
          <span
            className="ml-auto inline-flex items-baseline gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: statusColor }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 self-center rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            {STATUS_LABEL[s.status]}
          </span>
        </div>

        {/* Mega title — link al proyecto */}
        <Link
          href={`/projects/${s.id}`}
          className="group/title block"
          aria-label={`Abrir proyecto ${s.name}`}
        >
          <h2 className="flex items-start gap-4 text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[60px] md:text-[76px] lg:text-[88px]">
            <span className="min-w-0 flex-1">
              {s.name}
              <span
                aria-hidden
                className="text-[44px] sm:text-[60px] md:text-[76px] lg:text-[88px]"
                style={{ color: accent }}
              >
                .
              </span>
            </span>
            <ArrowUpRight
              aria-hidden
              className="mt-3 h-7 w-7 flex-shrink-0 text-ink-faint transition-all duration-300 ease-out group-hover/title:-translate-y-1 group-hover/title:translate-x-1 group-hover/title:text-ink sm:mt-4 sm:h-9 sm:w-9 md:mt-5 md:h-12 md:w-12"
            />
          </h2>
        </Link>

        {/* Description */}
        {s.description && (
          <p className="mt-6 max-w-[60ch] text-[17px] italic leading-[1.5] text-ink-soft sm:text-[19px]">
            {s.description}
          </p>
        )}

        {/* Stats strip — 3 numerales grandes */}
        <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
          <Stat
            label="Tareas activas"
            value={String(s.activeTasks)}
            sub={
              s.totalTasks > 0
                ? `de ${s.totalTasks} totales`
                : "ninguna creada"
            }
            accent={s.activeTasks > 0 ? "ink" : "faint"}
          />
          <Stat
            label="Progreso"
            value={percentComplete !== null ? `${percentComplete}%` : "—"}
            sub={
              percentComplete !== null
                ? `${s.doneTasks} terminadas`
                : "sin tareas"
            }
            accent={
              percentComplete === null
                ? "faint"
                : percentComplete >= 80
                  ? "done"
                  : "ink"
            }
            progress={percentComplete}
          />
          <Stat
            label={
              isOverdue
                ? "Atrasado"
                : daysRemaining !== null && daysRemaining >= 0
                  ? "Días restantes"
                  : endRef
                    ? "Fecha final"
                    : "Sin fecha"
            }
            value={
              daysRemaining === null
                ? "—"
                : isOverdue
                  ? `${Math.abs(daysRemaining)}`
                  : `${daysRemaining}`
            }
            sub={
              endRef
                ? formatDateCR(endRef)
                : "sin fecha definida"
            }
            accent={isOverdue ? "urgent" : "ink"}
          />
        </dl>
      </div>
    </article>
  );
}

// ── Stat ───────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent = "ink",
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ink" | "done" | "urgent" | "faint";
  /** 0–100 si querés rendir una barra horizontal abajo del numeral. */
  progress?: number | null;
}) {
  const numColor =
    accent === "done"
      ? "text-done"
      : accent === "urgent"
        ? "text-urgent"
        : accent === "faint"
          ? "text-ink-faint"
          : "text-ink";
  return (
    <div className="flex flex-col gap-2">
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[52px]",
          numColor
        )}
      >
        {value}
      </dd>
      {progress !== undefined && progress !== null && (
        <div
          className="mt-1 h-[2px] w-full bg-rule"
          aria-hidden
        >
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              accent === "done" ? "bg-done" : "bg-ink"
            )}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {sub && (
        <span className="text-[14px] italic text-ink-soft">{sub}</span>
      )}
    </div>
  );
}
