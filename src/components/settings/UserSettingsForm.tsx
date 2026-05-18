"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

export function UserSettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) toast.success("Perfil actualizado");
    else toast.error("Error al guardar");
    setLoading(false);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-4">
          <UserAvatar
            name={profile.name ?? undefined}
            avatarUrl={profile.avatarUrl ?? undefined}
            size="lg"
          />
          <div>
            <h3 className="font-semibold text-text">
              {profile.name ?? profile.email}
            </h3>
            <p className="text-sm text-text-muted">{profile.email}</p>
            <div className="mt-1">
              <RoleBadge
                role={profile.role as "admin" | "manager" | "member"}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="us-name"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Nombre completo
            </label>
            <Input
              id="us-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="us-email"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Correo electrónico
            </label>
            <Input id="us-email" type="email" value={profile.email} disabled />
            <p className="mt-1 text-xs text-text-tertiary">
              El correo no se puede cambiar
            </p>
          </div>

          <Button type="submit" loading={loading}>
            {loading ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
