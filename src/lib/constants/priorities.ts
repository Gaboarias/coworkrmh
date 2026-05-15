import type { TaskPriority } from "@/lib/types";

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string; icon: string }
> = {
  low: { label: "Baja", className: "priority-low", icon: "ArrowDown" },
  medium: { label: "Media", className: "priority-medium", icon: "Minus" },
  high: { label: "Alta", className: "priority-high", icon: "ArrowUp" },
  urgent: {
    label: "Urgente",
    className: "priority-urgent",
    icon: "AlertCircle",
  },
};
