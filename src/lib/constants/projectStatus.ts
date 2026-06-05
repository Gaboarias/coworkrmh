import type { ProjectStatus } from "@/lib/types";
import type { BadgeProps } from "@/components/ui/Badge";

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  active: { label: "Activo", variant: "success" },
  paused: { label: "En pausa", variant: "warning" },
  in_review: { label: "En revisión", variant: "info" },
  stopped: { label: "Detenido", variant: "danger" },
  completed: { label: "Completado", variant: "primary" },
  archived: { label: "Archivado", variant: "neutral" },
};

// Order shown in selectors (archived handled via archive/reactivate buttons)
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "active",
  "paused",
  "in_review",
  "stopped",
  "completed",
];
