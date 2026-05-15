import type { TaskStatus } from "@/lib/types";

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string; icon: string }
> = {
  todo: { label: "Por hacer", className: "status-todo", icon: "Circle" },
  in_progress: {
    label: "En progreso",
    className: "status-in_progress",
    icon: "Loader2",
  },
  review: { label: "En revisión", className: "status-review", icon: "Eye" },
  done: { label: "Completado", className: "status-done", icon: "CheckCircle2" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
];
