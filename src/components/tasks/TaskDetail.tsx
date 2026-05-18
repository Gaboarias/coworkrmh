"use client";

import { useEffect, useState } from "react";
import { X, CalendarDays, User, Flag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils/cn";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { TASK_STATUS_ORDER } from "@/lib/constants/taskStatus";

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

function safeDate(value: string | null, fmt: string) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : format(d, fmt);
}

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
    toast.success("Estado actualizado");
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

  const assignee = members.find((m) => m.id === assigneeId);
  const createdLabel = safeDate(task.createdAt, "dd/MM/yyyy HH:mm");
  const completedLabel = safeDate(task.completedAt, "dd/MM/yyyy");
  const dueLabel = safeDate(task.dueDate, "dd/MM/yyyy");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de tarea: ${task.title}`}
        className="h-full w-full max-w-md animate-slide-up overflow-y-auto border-l border-border bg-surface shadow-elev-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={status} />
            <TaskPriorityBadge priority={priority} />
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <h2 className="text-xl font-semibold text-text">{task.title}</h2>

          <div>
            <label
              htmlFor="td-desc"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-tertiary"
            >
              Descripción
            </label>
            <Textarea
              id="td-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Agrega una descripción…"
              rows={4}
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Estado
            </span>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    `status-${s}`,
                    status === s
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-surface"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="td-priority"
              className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary"
            >
              <Flag className="h-3 w-3" />
              Prioridad
            </label>
            <Select
              id="td-priority"
              value={priority}
              onChange={(e) =>
                handlePriorityChange(e.target.value as TaskPriority)
              }
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="td-assignee"
              className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary"
            >
              <User className="h-3 w-3" />
              Asignado a
            </label>
            <Select
              id="td-assignee"
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </option>
              ))}
            </Select>
            {assignee && (
              <div className="mt-2 flex items-center gap-2">
                <UserAvatar
                  name={assignee.name}
                  avatarUrl={assignee.avatarUrl}
                  size="xs"
                />
                <span className="text-xs text-text-muted">
                  {assignee.name ?? assignee.email}
                </span>
              </div>
            )}
          </div>

          {dueLabel && (
            <div>
              <span className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                <CalendarDays className="h-3 w-3" />
                Fecha límite
              </span>
              <p className="text-sm text-text">{dueLabel}</p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xs text-text-tertiary">
              {createdLabel && <span>Creado: {createdLabel}</span>}
              {completedLabel && <span>Completado: {completedLabel}</span>}
            </div>
          </div>
        </div>

        {saving && (
          <div
            aria-live="polite"
            className="fixed bottom-4 right-4 rounded-lg border border-border bg-surface-el px-3 py-1.5 text-xs text-text-muted shadow-elev-2"
          >
            Guardando…
          </div>
        )}
      </div>
    </div>
  );
}
