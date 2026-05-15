"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function UserSettingsForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName }),
    });
    if (res.ok) toast.success("Perfil actualizado");
    else toast.error("Error al guardar");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-4">
          <UserAvatar name={profile.full_name ?? undefined} avatarUrl={profile.avatar_url ?? undefined} size="lg" />
          <div>
            <h3 className="font-semibold text-text">{profile.full_name ?? profile.email}</h3>
            <p className="text-sm text-text-muted">{profile.email}</p>
            <div className="mt-1">
              <RoleBadge role={profile.role as "admin" | "manager" | "member"} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Correo electrónico
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text-tertiary"
            />
            <p className="mt-1 text-xs text-text-tertiary">El correo no se puede cambiar</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
