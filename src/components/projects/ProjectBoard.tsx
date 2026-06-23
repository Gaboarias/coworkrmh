"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { updateProject } from "@/lib/actions/projects";
import type { ProjectStatus } from "@/lib/types";
import type { ProjectSpecimen, BucketTab } from "./ProjectsExplorer";

const UNCAT = "__uncat__";

const STATUS_COLUMNS: { key: ProjectStatus; label: string }[] = [
  { key: "active", label: "Activo" },
  { key: "paused", label: "En pausa" },
  { key: "in_review", label: "En revisión" },
  { key: "stopped", label: "Detenido" },
  { key: "completed", label: "Completado" },
];

/**
 * Tablero tipo Trello de proyectos. Agrupable por CATEGORÍA (bucket) o por
 * ESTADO. Drag nativo HTML5: arrastrar un proyecto a otra columna recategoriza
 * (bucket) o cambia su estado (optimista + persiste vía updateProject).
 */
export function ProjectBoard({
  specimens,
  buckets,
  canEdit,
}: {
  specimens: ProjectSpecimen[];
  buckets: BucketTab[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<"bucket" | "status">("bucket");
  const [items, setItems] = useState(specimens);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const sig = specimens
    .map((s) => `${s.id}:${s.bucketId ?? ""}:${s.status}`)
    .join("|");
  useEffect(() => {
    setItems(specimens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const columns = useMemo(() => {
    if (groupBy === "status") {
      return STATUS_COLUMNS.map((c) => ({
        id: c.key as string,
        name: c.label,
        color: null as string | null,
      }));
    }
    const cols = buckets.map((b) => ({
      id: b.id,
      name: b.name,
      color: b.color,
    }));
    if (items.some((s) => !s.bucketId)) {
      cols.push({ id: UNCAT, name: "Sin categoría", color: null });
    }
    return cols;
  }, [groupBy, buckets, items]);

  function colOf(s: ProjectSpecimen): string {
    return groupBy === "status" ? s.status : s.bucketId ?? UNCAT;
  }

  async function move(projectId: string, colId: string) {
    const s = items.find((x) => x.id === projectId);
    if (!s || colOf(s) === colId) return;
    const prev = items;
    const bucket = buckets.find((b) => b.id === colId);
    setItems((arr) =>
      arr.map((x) =>
        x.id === projectId
          ? groupBy === "status"
            ? { ...x, status: colId as ProjectStatus }
            : {
                ...x,
                bucketId: colId === UNCAT ? null : colId,
                bucketName: colId === UNCAT ? null : bucket?.name ?? null,
                bucketColor: colId === UNCAT ? null : bucket?.color ?? null,
              }
          : x
      )
    );
    try {
      await updateProject(
        projectId,
        groupBy === "status"
          ? { status: colId as ProjectStatus }
          : { bucketId: colId === UNCAT ? null : colId }
      );
      router.refresh();
    } catch {
      setItems(prev);
      toast.error("No se pudo mover el proyecto");
    }
  }

  return (
    <div className="mt-2 space-y-6">
      {/* Toggle de agrupación */}
      <div className="flex items-center gap-1.5">
        {(
          [
            ["bucket", "Por categoría"],
            ["status", "Por estado"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setGroupBy(k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              groupBy === k
                ? "bg-accent-soft text-ink"
                : "text-ink-soft hover:bg-accent-soft hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colProjects = items.filter((s) => colOf(s) === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOver(col.id);
              }}
              onDragLeave={() =>
                setDragOver((c) => (c === col.id ? null : c))
              }
              onDrop={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) void move(id, col.id);
              }}
              className={cn(
                "flex w-[280px] flex-shrink-0 flex-col rounded-lg border transition-colors",
                dragOver === col.id
                  ? "border-ink/40 bg-accent-soft/40"
                  : "border-rule"
              )}
            >
              <div className="flex items-center justify-between border-b border-rule px-3 py-2.5">
                <span className="flex items-center gap-2">
                  {col.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                    {col.name}
                  </span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                  {colProjects.length}
                </span>
              </div>
              <div className="flex min-h-[60px] flex-col gap-2 p-2">
                {colProjects.length === 0 && (
                  <p className="px-2 py-6 text-center text-[12px] italic text-ink-faint">
                    —
                  </p>
                )}
                {colProjects.map((s) => {
                  const pct =
                    s.totalTasks > 0
                      ? Math.round((s.doneTasks / s.totalTasks) * 100)
                      : null;
                  return (
                    <div
                      key={s.id}
                      draggable={canEdit}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", s.id)
                      }
                      className="rounded-md border border-rule bg-surface-el p-3 active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor: s.color ?? "var(--ink-faint)",
                          }}
                        />
                        <Link
                          href={`/projects/${s.id}`}
                          draggable={false}
                          className="min-w-0 flex-1 text-[14px] font-bold leading-snug text-ink hover:underline"
                        >
                          {s.name}
                        </Link>
                      </div>
                      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-faint">
                        <span>{s.activeTasks} activas</span>
                        <span className="tabular-nums">
                          {pct !== null ? `${pct}%` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
