"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronDown,
  UserPlus,
  Layers,
  Users as UsersIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils/cn";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  listWorkspaceMembers,
} from "@/lib/actions/workspaces";

type Role = "admin" | "manager" | "member";
interface UserRow {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: Role;
}
interface WsRow {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}
interface Member {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export const AdminPanel = ({
  users,
  workspaces,
}: {
  users: UserRow[];
  workspaces: WsRow[];
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
        <WorkspacesTab
          workspaces={workspaces}
          allUsers={users}
          onChange={() => router.refresh()}
        />
      ) : (
        <UsersTab users={users} onChange={() => router.refresh()} />
      )}
    </div>
  );
};

// ─── Entornos ─────────────────────────────────────────────────────────────────

const WorkspacesTab = ({
  workspaces,
  allUsers,
  onChange,
}: {
  workspaces: WsRow[];
  allUsers: UserRow[];
  onChange: () => void;
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6B5FE4");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createWorkspace({ name: name.trim(), color });
      toast.success("Entorno creado");
      setName("");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setAddUserId("");
    if (!members[id]) {
      setLoadingMembers(true);
      try {
        const m = (await listWorkspaceMembers(id)) as Member[];
        setMembers((p) => ({ ...p, [id]: m }));
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  const refreshMembers = async (id: string) => {
    const m = (await listWorkspaceMembers(id)) as Member[];
    setMembers((p) => ({ ...p, [id]: m }));
  };

  const handleAdd = async (id: string) => {
    if (!addUserId) return;
    setBusy(true);
    try {
      await addWorkspaceMember(id, addUserId);
      toast.success("Miembro agregado");
      setAddUserId("");
      await refreshMembers(id);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string, userId: string) => {
    setBusy(true);
    try {
      await removeWorkspaceMember(id, userId);
      toast.success("Miembro removido");
      await refreshMembers(id);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este entorno? (solo si no tiene proyectos)")) return;
    try {
      await deleteWorkspace(id);
      toast.success("Entorno eliminado");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Nuevo entorno
          </h3>
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Nombre
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Azulejos & Colores"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-surface-el"
                aria-label="Color del entorno"
              />
            </div>
            <Button type="submit" loading={creating}>
              <Plus className="h-4 w-4" />
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="divide-y divide-border">
          {workspaces.length === 0 && (
            <p className="p-5 text-sm text-text-muted">
              Sin entornos. Creá el primero arriba.
            </p>
          )}
          {workspaces.map((w) => {
            const memberIds = new Set((members[w.id] ?? []).map((m) => m.id));
            const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));
            const isOpen = openId === w.id;
            return (
              <div key={w.id}>
                <button
                  onClick={() => toggle(w.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-el"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: w.color }}
                  >
                    <Layers className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-text">
                      {w.name}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {w.memberCount} miembro
                      {w.memberCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-text-tertiary transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-border bg-surface-el/40 px-4 py-4">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Agregar usuario
                        </label>
                        <Select
                          aria-label="Usuario"
                          value={addUserId}
                          onChange={(e) => setAddUserId(e.target.value)}
                        >
                          <option value="">Seleccionar…</option>
                          {nonMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.email}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(w.id)}
                        disabled={!addUserId || busy}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Agregar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(w.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar entorno
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {loadingMembers && !members[w.id] ? (
                        <p className="px-1 py-2 text-sm text-text-muted">
                          Cargando…
                        </p>
                      ) : (members[w.id] ?? []).length === 0 ? (
                        <p className="px-1 py-2 text-sm text-text-muted">
                          Sin miembros todavía.
                        </p>
                      ) : (
                        (members[w.id] ?? []).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-lg bg-surface p-2"
                          >
                            <UserAvatar
                              name={m.name ?? undefined}
                              avatarUrl={m.avatarUrl ?? undefined}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-text">
                                {m.name ?? m.email}
                              </p>
                              <p className="truncate text-xs text-text-muted">
                                {m.email}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemove(w.id, m.id)}
                              disabled={busy}
                              aria-label={`Quitar a ${m.name ?? m.email}`}
                              className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ─── Usuarios ─────────────────────────────────────────────────────────────────

const UsersTab = ({
  users,
  onChange,
}: {
  users: UserRow[];
  onChange: () => void;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al invitar");
      toast.success(
        data.emailSent
          ? "Usuario invitado por correo"
          : "Usuario creado — comparte el enlace"
      );
      setName("");
      setEmail("");
      setRole("member");
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
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
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
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
