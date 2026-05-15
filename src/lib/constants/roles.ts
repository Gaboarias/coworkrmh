import type { UserRole } from "@/lib/types";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Miembro" },
];
