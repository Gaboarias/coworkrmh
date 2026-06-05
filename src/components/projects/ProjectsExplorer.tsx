"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateCR, todayYmdCR } from "@/lib/utils/datetime";
import type { ProjectStatus } from "@/lib/types";

/**
 * /projects — Explorer con tabs por CATEGORÍA (bucket) + specimens grandes.
 *
 * Tabs derivados de los buckets reales de la DB. Click en un tab filtra los
 * specimens a los proyectos de esa categoría. Tab "Todos" muestra todo.
 * Tab "Sin categoría" agrupa proyectos sin bucket asignado (si hay).
 *
 * Specimens: 1 bloque por proyecto a ancho completo, mega-tipo Satoshi,
 * stats grandes (tareas activas, % completo, días restantes).
 */

export interface ProjectSpecimen {
  index: number;
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: ProjectStatus;
  bucketId: string | null;
  bucketName: string | null;
  bucketColor: string | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  totalTasks: number;
  doneTasks: number;
  activeTasks: number;
}

export interface BucketTab {
  id: string;
  name: string;
  color: string | null;
}

const UNCATEGORIZED_ID = "__uncategorized__";
const ALL_ID = "__all__";

const DEFAULT_PROJECT_COLOR = "var(--ink)";

export function ProjectsExplorer({
  specimens,
  buckets,
}: {
  specimens: ProjectSpecimen[];
  buckets: BucketTab[];
}) {
  const [filter, setFilter] = useState<string>(ALL_ID);

  // Detectar si hay proyectos sin bucket → agregar tab "Sin categoría".
  const hasUncategorized = specimens.some((s) => !s.bucketId);

  const tabs: Array<BucketTab & { count: number }> = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of specimens) {
      const key = s.bucketId ?? UNCATEGORIZED_ID;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const bucketTabs = buckets.map((b) => ({
      ...b,
      count: counts.get(b.id) ?? 0,
    }));
    const all = [
      { id: ALL_ID, name: "Todos", color: null, count: specimens.length },
      ...bucketTabs,
    ];
    if (hasUncategorized) {
      all.push({
        id: UNCATEGORIZED_ID,
        name: "Sin categoría",
        color: null,
        count: counts.get(UNCATEGORIZED_ID) ?? 0,
      });
    }
    return all;
  }, [specimens, buckets, hasUncategorized]);

  const visible = useMemo(() => {
    if (filter === ALL_ID) return specimens;
    if (filter === UNCATEGORIZED_ID) {
      return specimens.filter((s) => !s.bucketId);
    }
    return specimens.filter((s) => s.bucketId === filter);
  }, [specimens, filter]);

  return (
    <div className="mt-2 space-y-12">
      {/* ── Bucket tabs ───────────────────────────────────────── */}
      <nav
        aria-label="Filtrar por categoría"
        className="-mx-1 flex flex-wrap items-end gap-x-1 gap-y-2"
      >
        {tabs.map((t) => {
          const isActive = filter === t.id;
          const accent = t.color ?? "var(--ink)";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              aria-pressed={isActive}
              className={cn(
                "group/tab relative flex items-baseline gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                isActive ? "text-ink" : "text-ink-faint hover:text-ink-soft"
              )}
            >
              {t.color && (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 self-center rounded-full"
                  style={{ backgroundColor: t.color }}
                />
              )}
              <span className="font-bold">{t.name}</span>
              <span
                className={cn(
                  "tabular-nums",
                  isActive ? "text-ink-soft" : "text-ink-faint"
                )}
              >
                {t.count}
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
          No hay proyectos en esta categoría.
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
  const percentComplete =
    s.totalTasks > 0 ? Math.round((s.doneTasks / s.totalTasks) * 100) : null;

  // Días restantes — calculado en CR.
  let daysRemaining: number | null = null;
  let isOverdue = false;
  const endRef = s.endDate ?? s.dueDate;
  if (endRef) {
    const today = todayYmdCR();
    const endMs = new Date(endRef + "T12:00:00Z").getTime();
    const todayMs = new Date(today + "T12:00:00Z").getTime();
    const diff = Math.round((endMs - todayMs) / 86_400_000);
    daysRemaining = diff;
    isOverdue = diff < 0 && s.status !== "completed" && s.status !== "archived";
  }

  return (
    <article
      style={{
        animationDelay: `${Math.min(order, 8) * 60}ms`,
      }}
      className="group/specimen relative animate-fade-in py-14 first:pt-6 last:pb-6 md:py-20"
    >
      {/* Color band — left edge accent del color del proyecto */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 hidden h-[60%] w-[3px] -translate-y-1/2 md:block"
        style={{ backgroundColor: accent }}
      />

      <div className="md:pl-8">
        {/* Eyebrow row: hanging number + bucket */}
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
            sub={endRef ? formatDateCR(endRef) : "sin fecha definida"}
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
        <div className="mt-1 h-[2px] w-full bg-rule" aria-hidden>
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
