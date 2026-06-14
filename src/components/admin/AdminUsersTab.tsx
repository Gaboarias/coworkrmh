"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { AdminUserPasswordActions } from "@/components/admin/AdminUserPasswordActions";
import { AdminUserWorkspaces } from "@/components/admin/AdminUserWorkspaces";
import { cn } from "@/lib/utils/cn";

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

export const AdminUsersTab = ({
  users,
  workspaces,
  userWorkspaceIds,
  onChange,
}: {
  users: UserRow[];
  workspaces: WsRow[];
  userWorkspaceIds: Record<string, string[]>;
  onChange: () => void;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [inviteWorkspaceIds, setInviteWorkspaceIds] = useState<Set<string>>(
    () => new Set(workspaces.map((w) => w.id))
  );
  const [inviting, setInviting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const toggleInviteWorkspace = (id: string) => {
    setInviteWorkspaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          workspaceIds: [...inviteWorkspaceIds],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al invitar");
      const wsCount = inviteWorkspaceIds.size;
      const wsMsg = wsCount > 0 ? ` en ${wsCount} entorno${wsCount !== 1 ? "s" : ""}` : "";
      toast.success(
        data.emailSent
          ? `Usuario invitado por correo${wsMsg}`
          : `Usuario creado${wsMsg} — comparte el enlace`
      );
      setName("");
      setEmail("");
      setRole("member");
      setInviteWorkspaceIds(new Set(workspaces.map((w) => w.id)));
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Error al cambiar rol");
      toast.success("Rol actualizado");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Invitar usuario
          </h3>
          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@rwndmedia.com"
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Rol global"
            >
              <option value="member">Miembro</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
            <Button type="submit" loading={inviting}>
              <UserPlus className="h-4 w-4" />
              Invitar
            </Button>

            <div className="sm:col-span-2 mt-2">
              <p className="mb-2 text-xs font-medium text-text-muted">
                Entornos donde el usuario va a poder trabajar
                <span className="ml-1 font-mono text-[11px] tracking-[0.08em] text-ink-faint">
                  ({inviteWorkspaceIds.size} de {workspaces.length})
                </span>
              </p>
              {workspaces.length === 0 ? (
                <p className="text-xs italic text-text-tertiary">
                  No hay entornos creados todavía.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {workspaces.map((ws) => {
                    const isSelected = inviteWorkspaceIds.has(ws.id);
                    return (
                      <button
                        type="button"
                        key={ws.id}
                        onClick={() => toggleInviteWorkspace(ws.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors",
                          isSelected
                            ? "border-ink bg-accent-soft text-ink"
                            : "border-rule bg-transparent text-ink-soft hover:border-rule-strong hover:text-ink"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: ws.color }}
                        />
                        {ws.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-el">
              <UserAvatar
                name={u.name ?? undefined}
                avatarUrl={u.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {u.name ?? "Sin nombre"}
                </p>
                <p className="truncate text-xs text-text-muted">{u.email}</p>
                {u.workspaceCount === 0 && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-sm bg-urgent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-urgent">
                    Sin entorno
                  </span>
                )}
              </div>
              <Select
                aria-label={`Rol de ${u.name ?? u.email}`}
                value={u.role}
                disabled={savingId === u.id}
                onChange={(e) => changeRole(u.id, e.target.value)}
                className="w-32"
              >
                <option value="member">Miembro</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
              <AdminUserWorkspaces
                userId={u.id}
                userName={u.name ?? u.email}
                workspaces={workspaces}
                initialWorkspaceIds={userWorkspaceIds[u.id] ?? []}
              />
              <AdminUserPasswordActions
                userId={u.id}
                userEmail={u.email}
                userName={u.name}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
