"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTask } from "@/lib/actions/tasks";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { formatDateCR, isPastDateCR } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/cn";
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
} from "@/lib/constants/taskStatus";
import type { TaskStatus, TaskPriority } from "@/lib/types";

interface BoardTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee?: { name: string | null; avatarUrl: string | null } | null;
  assignees?: { id: string; name: string | null; avatarUrl: string | null }[];
}

interface TaskBoardProps {
  tasks: BoardTask[];
  projectId: string;
  canEdit: boolean;
  onSelectTask: (id: string) => void;
}

/**
 * Tablero tipo Trello de tareas de un proyecto. Columnas = estados.
 * Drag nativo HTML5 (sin dependencias): arrastrar una card a otra columna
 * cambia el estado (optimista + persiste vía updateTask).
 */
export function TaskBoard({
  tasks,
  projectId,
  canEdit,
  onSelectTask,
}: TaskBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  // Resync con props cuando cambia el set/estado (crear tarea, refresh, etc.),
  // sin clobberear un drag en vuelo si nada cambió.
  const sig = tasks.map((t) => `${t.id}:${t.status}`).join("|");
  useEffect(() => {
    setItems(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  async function move(taskId: string, to: TaskStatus) {
    const t = items.find((x) => x.id === taskId);
    if (!t || t.status === to) return;
    const prev = items;
    setItems((arr) =>
      arr.map((x) => (x.id === taskId ? { ...x, status: to } : x))
    );
    try {
      await updateTask(taskId, projectId, { status: to });
      router.refresh();
    } catch {
      setItems(prev);
      toast.error("No se pudo mover la tarea");
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_STATUS_ORDER.map((col) => {
        const colTasks = items.filter((t) => t.status === col);
        const cfg = TASK_STATUS_CONFIG[col];
        return (
          <div
            key={col}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setDragOver(col);
            }}
            onDragLeave={() =>
              setDragOver((c) => (c === col ? null : c))
            }
            onDrop={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) void move(id, col);
            }}
            className={cn(
              "flex w-[280px] flex-shrink-0 flex-col rounded-lg border transition-colors",
              dragOver === col
                ? "border-ink/40 bg-accent-soft/40"
                : "border-rule"
            )}
          >
            <div className="flex items-center justify-between border-b border-rule px-3 py-2.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                {cfg.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                {colTasks.length}
              </span>
            </div>
            <div className="flex min-h-[60px] flex-col gap-2 p-2">
              {colTasks.length === 0 && (
                <p className="px-2 py-6 text-center text-[12px] italic text-ink-faint">
                  —
                </p>
              )}
              {colTasks.map((t) => {
                const shown =
                  t.assignees && t.assignees.length > 0
                    ? t.assignees
                    : t.assignee
                    ? [t.assignee]
                    : [];
                const overdue =
                  !!t.dueDate && isPastDateCR(t.dueDate) && t.status !== "done";
                return (
                  <div
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", t.id)
                    }
                    onClick={() => onSelectTask(t.id)}
                    className="cursor-pointer rounded-md border border-rule bg-surface-el p-3 transition-colors hover:border-ink/30 active:cursor-grabbing"
                  >
                    <p className="text-[14px] font-medium leading-snug text-ink">
                      {t.title}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <TaskPriorityBadge priority={t.priority} />
                      <div className="flex items-center gap-2">
                        {t.dueDate && (
                          <span
                            className={cn(
                              "font-mono text-[11px]",
                              overdue ? "text-urgent" : "text-ink-faint"
                            )}
                          >
                            {formatDateCR(t.dueDate)}
                          </span>
                        )}
                        {shown.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {shown.slice(0, 3).map((a, i) => (
                              <span
                                key={i}
                                className="rounded-full ring-2 ring-bg"
                              >
                                <UserAvatar
                                  name={a.name}
                                  avatarUrl={a.avatarUrl}
                                  size="xs"
                                />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
