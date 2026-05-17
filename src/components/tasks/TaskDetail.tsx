"use client";

import { useState } from "react";
import { X, CalendarDays, User, Flag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { updateTask } from "@/lib/actions/tasks";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { TASK_STATUS_ORDER } from "@/lib/constants/taskStatus";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  creator?: { full_name: string | null } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface TaskDetailProps {
  task: Task;
  projectId: string;
  members: Profile[];
  onClose: () => void;
}

export function TaskDetail({ task, projectId, members, onClose }: TaskDetailProps) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md animate-slide-up overflow-y-auto border-l border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={status} />
            <TaskPriorityBadge priority={priority} />
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary transition hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Title */}
          <h2 className="text-xl font-semibold text-text">{task.title}</h2>

          {/* Description */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Agrega una descripción..."
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Estado
            </label>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    status === s
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-surface"
                      : "opacity-60 hover:opacity-100"
                  } status-${s}`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <Flag className="h-3 w-3" />
              Prioridad
            </label>
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <User className="h-3 w-3" />
              Asignado a
            </label>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.email}
                </option>
              ))}
            </select>
            {assigneeId && (
              <div className="mt-2 flex items-center gap-2">
                <UserAvatar
                  name={members.find((m) => m.id === assigneeId)?.full_name}
                  avatarUrl={members.find((m) => m.id === assigneeId)?.avatar_url}
                  size="xs"
                />
                <span className="text-xs text-text-muted">
                  {members.find((m) => m.id === assigneeId)?.full_name}
                </span>
              </div>
            )}
          </div>

          {/* Due date */}
          {task.due_date && (
            <div>
              <label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                <CalendarDays className="h-3 w-3" />
                Fecha límite
              </label>
              <p className="text-sm text-text">
                {format(new Date(task.due_date), "dd/MM/yyyy")}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>
                Creado:{" "}
                {format(new Date(task.created_at), "dd/MM/yyyy HH:mm")}
              </span>
              {task.completed_at && (
                <span>
                  Completado:{" "}
                  {format(new Date(task.completed_at), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        {saving && (
          <div className="fixed bottom-4 right-4 rounded-lg bg-surface-el px-3 py-1.5 text-xs text-text-muted">
            Guardando...
          </div>
        )}
      </div>
    </div>
  );
}
