"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface TeamManagementProps {
  members: Member[];
  currentUserId: string;
}

export function TeamManagement({ members, currentUserId }: TeamManagementProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    if (userId === currentUserId) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast.success("Rol actualizado");
      router.refresh();
    } else {
      toast.error("Error al actualizar rol");
    }
    setSaving(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="divide-y divide-border">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-4 p-4">
            <UserAvatar
              name={member.full_name ?? undefined}
              avatarUrl={member.avatar_url ?? undefined}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">
                {member.full_name ?? "Sin nombre"}
                {member.id === currentUserId && (
                  <span className="ml-2 text-xs text-text-tertiary">(tú)</span>
                )}
              </p>
              <p className="truncate text-sm text-text-muted">{member.email}</p>
            </div>

            {member.id === currentUserId ? (
              <RoleBadge role={member.role as "admin" | "manager" | "member"} />
            ) : (
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                disabled={saving === member.id}
                className="rounded-lg border border-border bg-surface-el px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Miembro</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
