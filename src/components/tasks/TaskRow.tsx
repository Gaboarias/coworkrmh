"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Trash2 } from "lucide-react";
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
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string | null; avatar_url: string | null } | null;
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
    const nextStatus = TASK_STATUS_ORDER[(currentIndex + 1) % TASK_STATUS_ORDER.length];
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
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    status !== "done";

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-surface-el"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Status toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          cycleStatus();
        }}
        disabled={loading}
        title="Cambiar estado"
        className="flex-shrink-0"
      >
        <TaskStatusBadge status={status} />
      </button>

      {/* Title */}
      <span
        className={`flex-1 truncate text-sm ${
          status === "done" ? "text-text-tertiary line-through" : "text-text"
        }`}
      >
        {task.title}
      </span>

      {/* Priority */}
      <TaskPriorityBadge priority={task.priority} />

      {/* Assignee */}
      {task.assignee && (
        <UserAvatar
          name={task.assignee.full_name}
          avatarUrl={task.assignee.avatar_url}
          size="xs"
        />
      )}

      {/* Due date */}
      {task.due_date && (
        <div
          className={`flex items-center gap-1 text-xs ${
            isOverdue ? "text-danger" : "text-text-tertiary"
          }`}
        >
          <CalendarDays className="h-3 w-3" />
          {format(new Date(task.due_date), "dd/MM")}
        </div>
      )}

      {/* Delete button */}
      {canEdit && (
        <button
          onClick={handleDelete}
          className="hidden text-text-tertiary transition hover:text-danger group-hover:block"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
