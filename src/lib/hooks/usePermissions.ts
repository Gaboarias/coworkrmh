"use client";

import { useUser } from "./useUser";
import { can } from "@/lib/utils/permissions";

type Action = Parameters<typeof can>[1];

export function usePermissions() {
  const { profile } = useUser();
  const role = (profile?.role ?? "member") as "admin" | "manager" | "member";

  return {
    can: (action: Action) => can(role, action),
    role,
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
  };
}
