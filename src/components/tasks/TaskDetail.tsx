"use client";

import { useEffect, useState } from "react";
import {
  X,
  CalendarDays,
  User,
  Flag,
  Circle,
  Loader2,
  Eye,
  CheckCircle2,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TaskExtras } from "./TaskExtras";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateTask } from "@/lib/actions/tasks";
import {
  listTaskComments,
  createTaskComment,
  deleteTaskComment,
  type TaskCommentRow,
} from "@/lib/actions/task-comments";
import { cn } from "@/lib/utils/cn";
import {
  formatDateCR,
  formatDateTimeCR,
  formatTimeCR,
} from "@/lib/utils/datetime";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import {
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
} from "@/lib/constants/taskStatus";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string | null;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface TaskDetailProps {
  task: Task;
  projectId: string;
  members: Profile[];
  onClose: () => void;
}

// ── Status & Priority maps (Spanish labels + semantic colors + icons) ────

const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Loader2,
  review: Eye,
  done: CheckCircle2,
};

// Color CSS variable por status — usadas para fondo, border, ring.
const STATUS_VAR: Record<TaskStatus, string> = {
  todo: "var(--ink-soft)",
  in_progress: "var(--info)",
  review: "var(--warn)",
  done: "var(--done)",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VAR: Record<TaskPriority, string> = {
  low: "var(--ink-faint)",
  medium: "var(--info)",
  high: "var(--warn)",
  urgent: "var(--urgent)",
};

const PRIORITY_ORDER: TaskPriority[] = ["low", "medium", "high", "urgent"];

// ── Component ──────────────────────────────────────────────────────────

export function TaskDetail({
  task,
  projectId,
  members,
  onClose,
}: TaskDetailProps) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Inline adjustment — resetear loading/comments en el mismo render donde
  // cambia task.id, evitando el flash de comentarios stale antes del fetch.
  const [prevTaskId, setPrevTaskId] = useState(task.id);
  if (task.id !== prevTaskId) {
    setPrevTaskId(task.id);
    setComments([]);
    setCommentsLoading(true);
  }

  // Cargar bitácora cuando task.id cambia.
  useEffect(() => {
    let alive = true;
    listTaskComments(task.id)
      .then((c) => {
        if (alive) setComments(c);
      })
      .catch(() => {
        if (alive) toast.error("Error al cargar la bitácora");
      })
      .finally(() => {
        if (alive) setCommentsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [task.id]);

  async function save(updates: Parameters<typeof updateTask>[2]) {
    setSaving(true);
    try {
      await updateTask(task.id, projectId, updates);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    setStatus(newStatus);
    await save({ status: newStatus });
    toast.success(`Estado: ${TASK_STATUS_CONFIG[newStatus].label}`);
  }

  async function handlePriorityChange(newPriority: TaskPriority) {
    setPriority(newPriority);
    await save({ priority: newPriority });
  }

  async function handleAssigneeChange(newAssigneeId: string) {
    setAssigneeId(newAssigneeId);
    await save({ assigneeId: newAssigneeId || null });
  }

  async function handleDescriptionBlur() {
    if (description !== task.description) {
      await save({ description: description || null });
      toast.success("Descripción guardada");
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;
    setPostingComment(true);
    try {
      const created = await createTaskComment(task.id, trimmed);
      setComments((prev) => [created, ...prev]);
      setNewComment("");
      toast.success("Nota agregada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(id: string) {
    if (!confirm("¿Borrar esta nota? Solo se puede dentro de los primeros 5 min."))
      return;
    try {
      await deleteTaskComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Nota borrada");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const assignee = members.find((m) => m.id === assigneeId);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de tarea: ${task.title}`}
        className="relative h-full w-full max-w-[720px] animate-slide-up overflow-y-auto border-l border-rule-strong bg-bg shadow-elev-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color band — left edge, del color del proyecto activo */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: "var(--project-color)" }}
        />

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-8 pt-8 md:px-12">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusPill status={status} />
              <PriorityPill priority={priority} />
            </div>
            <h2 className="mt-4 text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px] md:text-[52px]">
              {task.title}
              <span
                aria-hidden
                style={{ color: "var(--project-color)" }}
              >
                .
              </span>
            </h2>
            {task.createdAt && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                Creada {formatDateTimeCR(task.createdAt)}
                {task.completedAt &&
                  ` · Completada ${formatDateCR(task.completedAt)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex-shrink-0 rounded-md p-2 text-ink-faint transition-colors hover:bg-surface-el hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-10 px-8 pb-16 pt-10 md:px-12">
          {/* ── Status — segmented buttons con color semántico ───── */}
          <section>
            <SectionLabel>Estado</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TASK_STATUS_ORDER.map((s) => {
                const Icon = STATUS_ICON[s];
                const isActive = status === s;
                const color = STATUS_VAR[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    aria-pressed={isActive}
                    className={cn(
                      "group/status flex items-center gap-2 rounded-md border px-3 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ease-out",
                      isActive
                        ? "text-bg shadow-elev-1"
                        : "text-ink-soft hover:bg-surface-el hover:text-ink"
                    )}
                    style={{
                      borderColor: isActive
                        ? color
                        : "var(--rule)",
                      backgroundColor: isActive ? color : "transparent",
                    }}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        s === "in_progress" && isActive && "animate-spin"
                      )}
                    />
                    <span className="truncate">{TASK_STATUS_CONFIG[s].label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Priority — chips con color ─────────────────────────── */}
          <section>
            <SectionLabel icon={<Flag className="h-3 w-3" />}>
              Prioridad
            </SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRIORITY_ORDER.map((p) => {
                const isActive = priority === p;
                const color = PRIORITY_VAR[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-200 ease-out",
                      isActive
                        ? "text-bg"
                        : "text-ink-soft hover:bg-surface-el hover:text-ink"
                    )}
                    style={{
                      borderColor: isActive ? color : "var(--rule)",
                      backgroundColor: isActive ? color : "transparent",
                    }}
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? "var(--bg)" : color,
                      }}
                    />
                    {PRIORITY_LABEL[p]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Asignado a ───────────────────────────────────────── */}
          <section>
            <SectionLabel icon={<User className="h-3 w-3" />}>
              Asignado a
            </SectionLabel>
            <div className="mt-3 flex items-center gap-3">
              {assignee && (
                <UserAvatar
                  name={assignee.name}
                  avatarUrl={assignee.avatarUrl}
                  size="sm"
                />
              )}
              <Select
                value={assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="flex-1"
              >
                <option value="">Sin asignar</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </Select>
            </div>
          </section>

          {/* ── Due date ─────────────────────────────────────────── */}
          {task.dueDate && (
            <section>
              <SectionLabel icon={<CalendarDays className="h-3 w-3" />}>
                Fecha límite
              </SectionLabel>
              <p className="mt-2 text-[20px] font-bold tabular-nums text-ink">
                {formatDateCR(task.dueDate)}
              </p>
            </section>
          )}

          {/* ── Descripción ──────────────────────────────────────── */}
          <section>
            <SectionLabel>Descripción</SectionLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Agrega una descripción…"
              rows={4}
              className="mt-3"
            />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              Editable · se guarda al perder foco
            </p>
          </section>

          {/* ── Tags + Subtareas (TaskExtras) ────────────────────── */}
          <section className="space-y-8 border-t border-rule pt-8">
            <TaskExtras taskId={task.id} projectId={projectId} />
          </section>

          {/* ── Bitácora (append-only) ───────────────────────────── */}
          <section className="border-t border-rule pt-8">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
                Bitácora
              </h3>
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                {commentsLoading
                  ? "cargando…"
                  : `${comments.length} ${comments.length === 1 ? "entrada" : "entradas"}`}
              </span>
            </div>
            <p className="mt-1 text-[13px] italic text-ink-soft">
              Las notas son append-only. Borrar permitido sólo al autor en los primeros 5 min.
            </p>

            {/* Form: agregar nota */}
            <form onSubmit={handleAddComment} className="mt-4 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribir una nota para la bitácora…"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddComment(e as unknown as React.FormEvent);
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  ⌘ + Enter para enviar
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || postingComment}
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-bg transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {postingComment ? "Guardando…" : "Agregar nota"}
                </button>
              </div>
            </form>

            {/* Timeline de entradas */}
            <ol className="mt-8 space-y-6">
              {!commentsLoading && comments.length === 0 && (
                <li className="py-6 text-center text-sm italic text-ink-faint">
                  Sin entradas todavía. Sé el primero en anotar algo.
                </li>
              )}
              {comments.map((c, i) => (
                <li key={c.id} className="relative pl-12">
                  {/* Hanging number */}
                  <span className="absolute left-0 top-0 font-mono text-[12px] font-bold tabular-nums text-ink-faint">
                    {String(comments.length - i).padStart(2, "0")}
                  </span>
                  {/* Connector line vertical (excepto el último) */}
                  {i < comments.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[7px] top-6 h-[calc(100%+0.5rem)] w-px bg-rule"
                    />
                  )}

                  <header className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                      {c.author.name ?? c.author.email}
                    </span>
                    <time className="font-mono text-[11px] tabular-nums text-ink-faint">
                      {formatDateCR(c.createdAt)} · {formatTimeCR(c.createdAt)}
                    </time>
                    {c.canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label="Borrar nota (5 min window)"
                        className="ml-auto rounded p-1 text-ink-faint transition-colors hover:bg-urgent/10 hover:text-urgent"
                        title="Borrar (ventana de 5 min)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </header>
                  <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                    {c.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {saving && (
          <div
            aria-live="polite"
            className="fixed bottom-4 right-4 rounded-md border border-rule-strong bg-surface-el px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft shadow-elev-2"
          >
            Guardando…
          </div>
        )}
      </div>
    </div>
  );
}

// ── Atoms ───────────────────────────────────────────────────────────

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
      {icon}
      {children}
    </h3>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  const Icon = STATUS_ICON[status];
  const color = STATUS_VAR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
        color: color,
      }}
    >
      <Icon
        className={cn("h-3 w-3", status === "in_progress" && "animate-spin")}
      />
      {TASK_STATUS_CONFIG[status].label}
    </span>
  );
}

function PriorityPill({ priority }: { priority: TaskPriority }) {
  const color = PRIORITY_VAR[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
        color: color,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
