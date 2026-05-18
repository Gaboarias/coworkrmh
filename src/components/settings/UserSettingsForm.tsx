"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
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
  const router = useRouter();
  const [name, setName] = useState(profile.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      toast.success("Perfil actualizado");
      router.refresh();
    } else toast.error("Error al guardar");
    setLoading(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen");
      setAvatarUrl(data.avatarUrl);
      toast.success("Foto actualizada");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cambiar la contraseña");
      toast.success("Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Cambiar foto de perfil"
                className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserAvatar
                  name={name || profile.email}
                  avatarUrl={avatarUrl ?? undefined}
                  size="lg"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
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

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-text">
            Cambiar contraseña
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label
                htmlFor="us-cur-pw"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Contraseña actual
              </label>
              <Input
                id="us-cur-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="us-new-pw"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Nueva contraseña
                </label>
                <Input
                  id="us-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="us-conf-pw"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Confirmar contraseña
                </label>
                <Input
                  id="us-conf-pw"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              Mínimo 8 caracteres.
            </p>
            <Button type="submit" loading={pwLoading}>
              {pwLoading ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
