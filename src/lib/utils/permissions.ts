import type { UserRole } from "@/lib/types";

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Administrador",
    manager: "Manager",
    member: "Miembro",
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "text-urgent bg-urgent/10",
    manager: "text-warn bg-warn/10",
    member: "text-info bg-info/10",
  };
  return colors[role];
}
