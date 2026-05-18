"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, Mail } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState<{
    url: string;
    emailSent: boolean;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setInvite(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el miembro");
      setInvite({
        url: data.inviteUrl,
        emailSent: data.emailSent,
        email: data.user.email,
      });
      toast.success(
        data.emailSent
          ? "Miembro invitado por correo"
          : "Miembro creado — comparte el enlace de invitación"
      );
      setName("");
      setEmail("");
      setRole("member");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 text-sm font-semibold text-text">
            Agregar miembro
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            Crea la cuenta y comparte el enlace de invitación para que defina su
            contraseña.
          </p>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tm-name"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Nombre
                </label>
                <Input
                  id="tm-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label
                  htmlFor="tm-email"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Correo *
                </label>
                <Input
                  id="tm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="persona@rwndmedia.com"
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="tm-role"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Rol
                </label>
                <Select
                  id="tm-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="member">Miembro</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <Button type="submit" loading={inviting}>
                <UserPlus className="h-4 w-4" />
                {inviting ? "Creando…" : "Crear invitación"}
              </Button>
            </div>
          </form>

          {invite && (
            <div className="mt-4 rounded-lg border border-border bg-surface-el p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm text-text">
                <Mail className="h-3.5 w-3.5 text-text-muted" />
                {invite.emailSent
                  ? `Invitación enviada a ${invite.email}`
                  : `Comparte este enlace con ${invite.email} (válido 7 días):`}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={invite.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <span className="ml-2 text-xs text-text-tertiary">
                      (tú)
                    </span>
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
    </div>
  );
}
