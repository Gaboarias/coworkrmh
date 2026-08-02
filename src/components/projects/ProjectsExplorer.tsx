"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatDateCR, todayYmdCR } from "@/lib/utils/datetime";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { ProjectStatus } from "@/lib/types";

/**
 * /projects — cartera agrupada por categoría (bucket).
 *
 * Antes era un "specimen" por proyecto: un bloque a ancho completo con el
 * título en 52px, la descripción y una grilla de tres cifras grandes. Bonito de
 * a uno, pero un equipo con doce proyectos tenía que scrollear doce pantallas
 * para ver su cartera — y los buckets eran tabs, así que ver dos negocios a la
 * vez era imposible.
 *
 * Ahora el bucket es un ENCABEZADO DE SECCIÓN y cada proyecto una fila. Todo a
 * la vista, cero clics para comparar. Es el mismo gesto que ya usa el ERP y el
 * que la dirección pide: densidad con jerarquía, no una pantalla por dato.
 *
 * Cada fila responde lo que se necesita sin abrir el proyecto: en qué estado
 * está, cuánto lleva, quién lo trabaja y cuándo vence. La descripción NO entra:
 * es lo que más ancho come y lo que menos se usa para decidir dónde entrar.
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
  members: { id: string; name: string | null; avatarUrl: string | null }[];
}

export interface BucketTab {
  id: string;
  name: string;
  color: string | null;
}

const UNCATEGORIZED_ID = "__uncategorized__";

/** Estado + color. El color acompaña, nunca informa solo. */
const STATUS: Record<ProjectStatus, { label: string; tone: string }> = {
  active: { label: "En curso", tone: "text-done" },
  paused: { label: "En pausa", tone: "text-ink-faint" },
  in_review: { label: "Revisión", tone: "text-info" },
  stopped: { label: "Detenido", tone: "text-urgent" },
  completed: { label: "Completado", tone: "text-ink-soft" },
  archived: { label: "Archivado", tone: "text-ink-faint" },
};

/** Cuántos avatares antes de resumir en "+N". */
const AVATARS_SHOWN = 3;

interface Section {
  id: string;
  name: string;
  color: string | null;
  projects: ProjectSpecimen[];
}

export function ProjectsExplorer({
  specimens,
  buckets,
}: {
  specimens: ProjectSpecimen[];
  buckets: BucketTab[];
}) {
  const sections: Section[] = useMemo(() => {
    const byBucket = new Map<string, ProjectSpecimen[]>();
    for (const s of specimens) {
      const key = s.bucketId ?? UNCATEGORIZED_ID;
      const list = byBucket.get(key) ?? [];
      list.push(s);
      byBucket.set(key, list);
    }

    // Se respeta el orden de `buckets` (viene ordenado por posición desde la
    // DB) y se omiten los vacíos: una sección con cero proyectos es ruido.
    const out: Section[] = buckets
      .filter((b) => byBucket.has(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
        color: b.color,
        projects: byBucket.get(b.id)!,
      }));

    // "Sin categoría" va último: es una bandeja de entrada, no un negocio.
    const orphans = byBucket.get(UNCATEGORIZED_ID);
    if (orphans?.length) {
      out.push({
        id: UNCATEGORIZED_ID,
        name: "Sin categoría",
        color: null,
        projects: orphans,
      });
    }
    return out;
  }, [specimens, buckets]);

  return (
    <div className="mt-4 space-y-10">
      {sections.map((section) => (
        <section key={section.id} aria-label={section.name}>
          <div className="flex items-baseline justify-between gap-4 border-b border-rule-strong pb-2">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink">
              {section.color && (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
              )}
              {section.name}
            </h2>
            <span className="flex-shrink-0 text-[11px] tabular-nums text-ink-faint">
              {section.projects.length}{" "}
              {section.projects.length === 1 ? "proyecto" : "proyectos"}
            </span>
          </div>

          <ul className="divide-y divide-rule">
            {section.projects.map((p) => (
              <ProjectRow key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectSpecimen }) {
  const status = STATUS[p.status] ?? STATUS.active;
  const overdue =
    !!p.dueDate && p.dueDate < todayYmdCR() && p.status !== "completed";
  const extra = p.members.length - AVATARS_SHOWN;

  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center gap-4 py-[var(--erp-row-py)] pr-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Color del proyecto: la única pista cromática de identidad en la
            fila. 2px, no una barra — es una marca, no un adorno. */}
        <span
          aria-hidden
          className="h-8 w-[2px] flex-shrink-0"
          style={{ backgroundColor: p.color ?? "var(--rule-strong)" }}
        />

        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {p.name}
        </span>

        {/* Estado: color + etiqueta, nunca color solo. */}
        <span
          className={cn(
            "hidden w-[84px] flex-shrink-0 text-[11px] uppercase tracking-[0.1em] sm:block",
            status.tone
          )}
        >
          {status.label}
        </span>

        {/* Avance. La barra es redundante con la cifra a propósito: se lee de
            un vistazo al escanear la columna, sin leer cada número. */}
        <span className="hidden w-[92px] flex-shrink-0 items-center gap-2 md:flex">
          <span
            aria-hidden
            className="h-[3px] flex-1 bg-rule"
          >
            <span
              className="block h-full bg-accent"
              style={{
                width: p.totalTasks
                  ? `${Math.round((p.doneTasks / p.totalTasks) * 100)}%`
                  : "0%",
              }}
            />
          </span>
          <span className="text-[11px] tabular-nums text-ink-faint">
            {p.doneTasks}/{p.totalTasks}
          </span>
        </span>

        {/* Equipo. `-space-x-1` los solapa para que tres personas ocupen menos
            que tres avatares sueltos. */}
        <span className="hidden w-[76px] flex-shrink-0 items-center lg:flex">
          {p.members.length === 0 ? (
            <span className="text-[11px] text-ink-faint">—</span>
          ) : (
            <span className="flex -space-x-1">
              {p.members.slice(0, AVATARS_SHOWN).map((m) => (
                <UserAvatar
                  key={m.id}
                  name={m.name}
                  avatarUrl={m.avatarUrl}
                  size="xs"
                />
              ))}
              {extra > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[9px] tabular-nums text-ink-soft ring-1 ring-bg">
                  +{extra}
                </span>
              )}
            </span>
          )}
        </span>

        {/* Entrega. Vencida en urgente — el color acompaña a la fecha, que ya
            dice por sí sola qué pasó. */}
        <span
          className={cn(
            "w-[64px] flex-shrink-0 text-right text-[11px] tabular-nums",
            overdue ? "text-urgent" : "text-ink-faint"
          )}
        >
          {p.dueDate ? formatDateCR(p.dueDate, { month: "short" }) : "—"}
        </span>
      </Link>
    </li>
  );
}
