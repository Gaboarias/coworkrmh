"use client";

import { useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { formatDateCR, isPastDateCR } from "@/lib/utils/datetime";
import { toast } from "sonner";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { updateTask, deleteTask } from "@/lib/actions/tasks";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { TASK_STATUS_ORDER } from "@/lib/constants/taskStatus";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee?: { name: string | null; avatarUrl: string | null } | null;
  assignees?: { id: string; name: string | null; avatarUrl: string | null }[];
}

interface TaskRowProps {
  task: Task;
  projectId: string;
  canEdit?: boolean;
  onClick?: () => void;
}

export function TaskRow({
  task,
  projectId,
  canEdit = true,
  onClick,
}: TaskRowProps) {
  const [status, setStatus] = useState(task.status);
  const [loading, setLoading] = useState(false);

  async function cycleStatus() {
    if (!canEdit || loading) return;
    const currentIndex = TASK_STATUS_ORDER.indexOf(status);
    const nextStatus =
      TASK_STATUS_ORDER[(currentIndex + 1) % TASK_STATUS_ORDER.length];
    setLoading(true);
    setStatus(nextStatus);
    try {
      await updateTask(task.id, projectId, { status: nextStatus });
      toast.success(`Estado: ${nextStatus.replace("_", " ")}`);
    } catch {
      setStatus(status);
      toast.error("Error al actualizar estado");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteTask(task.id, projectId);
      toast.success("Tarea eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const isOverdue =
    !!task.dueDate && isPastDateCR(task.dueDate) && status !== "done";

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors duration-200 ease-out hover:border-border hover:bg-surface-el"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          cycleStatus();
        }}
        disabled={loading}
        aria-label="Cambiar estado de la tarea"
        title="Cambiar estado"
        className="flex-shrink-0"
      >
        <TaskStatusBadge status={status} />
      </button>

      <span
        className={`flex-1 truncate text-sm ${
          status === "done" ? "text-text-tertiary line-through" : "text-text"
        }`}
      >
        {task.title}
      </span>

      <TaskPriorityBadge priority={task.priority} />

      {(() => {
        const shown =
          task.assignees && task.assignees.length > 0
            ? task.assignees
            : task.assignee
            ? [task.assignee]
            : [];
        if (shown.length === 0) return null;
        return (
          <div className="flex flex-shrink-0 -space-x-1.5">
            {shown.slice(0, 3).map((a, i) => (
              <span key={i} className="rounded-full ring-2 ring-bg">
                <UserAvatar name={a.name} avatarUrl={a.avatarUrl} size="xs" />
              </span>
            ))}
            {shown.length > 3 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-el text-[9px] font-bold text-text-tertiary ring-2 ring-bg">
                +{shown.length - 3}
              </span>
            )}
          </div>
        );
      })()}

      {task.dueDate && (
        <div
          className={`flex items-center gap-1 text-xs ${
            isOverdue ? "text-danger" : "text-text-tertiary"
          }`}
        >
          <CalendarDays className="h-3 w-3" />
          {formatDateCR(task.dueDate)}
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Eliminar tarea"
          className="hidden text-text-tertiary transition-colors hover:text-danger group-hover:block"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
