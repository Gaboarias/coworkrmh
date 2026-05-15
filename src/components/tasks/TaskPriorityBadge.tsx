import { PRIORITY_CONFIG } from "@/lib/constants/priorities";
import { cn } from "@/lib/utils/cn";
import type { TaskPriority } from "@/lib/types";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
