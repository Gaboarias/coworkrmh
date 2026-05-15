import { cn } from "@/lib/utils/cn";
import { getRoleLabel, getRoleColor } from "@/lib/utils/permissions";
import type { UserRole } from "@/lib/types";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        getRoleColor(role),
        className
      )}
    >
      {getRoleLabel(role)}
    </span>
  );
}
