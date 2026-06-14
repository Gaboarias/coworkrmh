"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminWorkspacesTab } from "@/components/admin/AdminWorkspacesTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";

type Role = "admin" | "manager" | "member";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: Role;
  workspaceCount?: number;
}

interface WsRow {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

export const AdminPanel = ({
  users,
  workspaces,
  userWorkspaceIds,
}: {
  users: UserRow[];
  workspaces: WsRow[];
  userWorkspaceIds: Record<string, string[]>;
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "workspaces">("workspaces");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["workspaces", "Entornos", Layers],
            ["users", "Usuarios", UsersIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "workspaces" ? (
        <AdminWorkspacesTab
          workspaces={workspaces}
          allUsers={users}
          onChange={() => router.refresh()}
        />
      ) : (
        <AdminUsersTab
          users={users}
          workspaces={workspaces}
          userWorkspaceIds={userWorkspaceIds}
          onChange={() => router.refresh()}
        />
      )}
    </div>
  );
};
