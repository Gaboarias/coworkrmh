import type { UserRole } from "@/lib/types";

type Action =
  | "create:project"
  | "update:project"
  | "delete:project"
  | "manage:members"
  | "create:task"
  | "update:task"
  | "delete:task"
  | "view:crm"
  | "manage:crm"
  | "view:accounts"
  | "manage:team"
  | "view:changelog";

const rolePermissions: Record<UserRole, Action[]> = {
  admin: [
    "create:project",
    "update:project",
    "delete:project",
    "manage:members",
    "create:task",
    "update:task",
    "delete:task",
    "view:crm",
    "manage:crm",
    "view:accounts",
    "manage:team",
    "view:changelog",
  ],
  manager: [
    "create:project",
    "update:project",
    "manage:members",
    "create:task",
    "update:task",
    "delete:task",
    "view:crm",
    "manage:crm",
    "view:changelog",
  ],
  member: ["create:task", "update:task", "view:changelog"],
};

export function can(role: UserRole, action: Action): boolean {
  return rolePermissions[role]?.includes(action) ?? false;
}

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
    admin: "text-danger bg-danger/10",
    manager: "text-warning bg-warning/10",
    member: "text-info bg-info/10",
  };
  return colors[role];
}
