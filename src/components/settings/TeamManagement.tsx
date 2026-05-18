"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

interface Member {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

interface TeamManagementProps {
  members: Member[];
  currentUserId: string;
}

export function TeamManagement({
  members,
  currentUserId,
}: TeamManagementProps) {
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
    <Card>
      <div className="divide-y divide-border">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-4 p-4">
            <UserAvatar
              name={member.name ?? undefined}
              avatarUrl={member.avatarUrl ?? undefined}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">
                {member.name ?? "Sin nombre"}
                {member.id === currentUserId && (
                  <span className="ml-2 text-xs text-text-tertiary">(tú)</span>
                )}
              </p>
              <p className="truncate text-sm text-text-muted">
                {member.email}
              </p>
            </div>

            {member.id === currentUserId ? (
              <RoleBadge
                role={member.role as "admin" | "manager" | "member"}
              />
            ) : (
              <Select
                aria-label={`Rol de ${member.name ?? member.email}`}
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                disabled={saving === member.id}
                className="w-auto pr-8 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Miembro</option>
              </Select>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
