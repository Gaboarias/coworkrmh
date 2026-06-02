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
import { SwatchPicker } from "@/components/ui/SwatchPicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { AdminUserPasswordActions } from "@/components/admin/AdminUserPasswordActions";
import { AdminUserWorkspaces } from "@/components/admin/AdminUserWorkspaces";
import { cn } from "@/lib/utils/cn";
import { readableFg } from "@/lib/utils/color";
import { DEFAULT_ENTORNO_COLOR } from "@/lib/constants/entornoColors";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  listWorkspaceMembers,
  setMemberRole,
  getWorkspacePermissionMatrix,
  updateWorkspacePermissions,
  createCustomWorkspaceRole,
  deleteCustomWorkspaceRole,
} from "@/lib/actions/workspaces";
import {
  WS_PERMISSION_GROUPS,
  BUILTIN_ROLE_KEYS,
  BUILTIN_ROLE_LABELS,
  type WsRolePermissions,
} from "@/lib/constants/workspacePermissions";

type Role = "admin" | "manager" | "member";
// Rol de entorno: built-in (owner/admin/member) o key custom definida por el admin.
type WsRole = string;
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
  role: WsRole;
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
        <UsersTab
          users={users}
          workspaces={workspaces}
          onChange={() => router.refresh()}
        />
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
  const [color, setColor] = useState<string>(DEFAULT_ENTORNO_COLOR);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_ENTORNO_COLOR);
  const [savingEdit, setSavingEdit] = useState(false);
  const [matrix, setMatrix] = useState<Record<string, WsRolePermissions>>({});
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);

  const togglePerm = (wsId: string, role: string, key: string) => {
    setMatrix((p) => {
      const cur = p[wsId] ?? { admin: [], member: [] };
      const set = new Set(cur[role] ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...p, [wsId]: { ...cur, [role]: [...set] } };
    });
  };

  const [newRoleName, setNewRoleName] = useState<Record<string, string>>({});
  const [creatingRole, setCreatingRole] = useState(false);

  const handleCreateCustomRole = async (id: string) => {
    const name = (newRoleName[id] ?? "").trim();
    if (!name) return;
    setCreatingRole(true);
    try {
      const { key } = await createCustomWorkspaceRole(id, name);
      toast.success(`Rol "${key}" creado`);
      setNewRoleName((p) => ({ ...p, [id]: "" }));
      const mx = await getWorkspacePermissionMatrix(id);
      setMatrix((p) => ({ ...p, [id]: mx }));
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteCustomRole = async (id: string, roleKey: string) => {
    if (
      !confirm(
        `¿Eliminar el rol "${roleKey}"? Los miembros con ese rol pasarán a "Miembro".`
      )
    )
      return;
    try {
      await deleteCustomWorkspaceRole(id, roleKey);
      toast.success("Rol eliminado");
      const mx = await getWorkspacePermissionMatrix(id);
      setMatrix((p) => ({ ...p, [id]: mx }));
      await refreshMembers(id);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSaveMatrix = async (id: string) => {
    const mx = matrix[id];
    if (!mx) return;
    setSavingMatrix(true);
    try {
      await updateWorkspacePermissions(id, mx);
      toast.success("Permisos actualizados");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleChangeRole = async (
    id: string,
    userId: string,
    role: string
  ) => {
    setSavingRoleFor(userId);
    try {
      await setMemberRole(id, userId, role);
      toast.success("Rol actualizado");
      await refreshMembers(id);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingRoleFor(null);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateWorkspace(id, { name: editName.trim(), color: editColor });
      toast.success("Entorno actualizado");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

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

  const toggle = async (w: WsRow) => {
    const id = w.id;
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setAddUserId("");
    setEditName(w.name);
    setEditColor(w.color);
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
    if (!matrix[id]) {
      try {
        const mx = await getWorkspacePermissionMatrix(id);
        setMatrix((p) => ({ ...p, [id]: mx }));
      } catch {
        /* sin permiso de gestión: matriz no editable */
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
              <div className="flex h-9 items-center">
                <SwatchPicker
                  value={color}
                  onChange={setColor}
                  label="Color del entorno"
                />
              </div>
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
                  onClick={() => toggle(w)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-el"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: w.color,
                      color: readableFg(w.color),
                    }}
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
                    <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
                      <div className="min-w-[180px] flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Nombre del entorno
                        </label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Nombre del entorno"
                        />
                      </div>
                      <div>
                        <span className="mb-1.5 block text-xs font-medium text-text-muted">
                          Color
                        </span>
                        <SwatchPicker
                          value={editColor}
                          onChange={setEditColor}
                          label="Color del entorno"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(w.id)}
                        loading={savingEdit}
                        disabled={!editName.trim()}
                      >
                        Guardar
                      </Button>
                    </div>

                    {matrix[w.id] && (
                      <div className="space-y-3 border-b border-border pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-text">
                              Permisos por rol
                            </h4>
                            <p className="text-[13px] text-text-muted">
                              El propietario siempre tiene acceso total.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveMatrix(w.id)}
                            loading={savingMatrix}
                          >
                            Guardar permisos
                          </Button>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                          {(() => {
                            const roleKeys = Object.keys(matrix[w.id]).filter(
                              (k) => k !== "owner"
                            );
                            return (
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-border text-xs text-text-muted">
                                    <th className="px-3 py-2 font-medium">
                                      Capacidad
                                    </th>
                                    {roleKeys.map((rk) => {
                                      const isBuiltin = BUILTIN_ROLE_KEYS.includes(
                                        rk as never
                                      );
                                      return (
                                        <th
                                          key={rk}
                                          className="w-24 px-2 py-2 text-center font-medium"
                                        >
                                          <div className="flex items-center justify-center gap-1">
                                            <span className="truncate" title={rk}>
                                              {BUILTIN_ROLE_LABELS[rk] ?? rk}
                                            </span>
                                            {!isBuiltin && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteCustomRole(w.id, rk)
                                                }
                                                aria-label={`Eliminar rol ${rk}`}
                                                className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {WS_PERMISSION_GROUPS.map((g) => (
                                    <GroupRows
                                      key={g.group}
                                      group={g.group}
                                      keys={g.keys}
                                      matrix={matrix[w.id]}
                                      roleKeys={roleKeys}
                                      onToggle={(role, key) =>
                                        togglePerm(w.id, role, key)
                                      }
                                    />
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                        <div className="flex flex-wrap items-end gap-2 pt-1">
                          <div className="min-w-[160px] flex-1">
                            <label className="mb-1.5 block text-xs font-medium text-text-muted">
                              Crear rol custom
                            </label>
                            <Input
                              value={newRoleName[w.id] ?? ""}
                              onChange={(e) =>
                                setNewRoleName((p) => ({
                                  ...p,
                                  [w.id]: e.target.value,
                                }))
                              }
                              placeholder="Ej. Diseñadora, Cotizador…"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateCustomRole(w.id)}
                            disabled={
                              !(newRoleName[w.id] ?? "").trim() || creatingRole
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Crear rol
                          </Button>
                        </div>
                      </div>
                    )}

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
                            {m.role === "owner" ? (
                              <span className="rounded-md bg-surface-el px-2 py-1 text-xs font-medium text-text-muted">
                                Propietario
                              </span>
                            ) : (
                              <Select
                                aria-label={`Rol de ${m.name ?? m.email}`}
                                value={m.role}
                                disabled={savingRoleFor === m.id}
                                onChange={(e) =>
                                  handleChangeRole(w.id, m.id, e.target.value)
                                }
                                className="w-32"
                              >
                                {(() => {
                                  const matrixKeys = matrix[w.id]
                                    ? Object.keys(matrix[w.id]).filter(
                                        (k) => k !== "owner"
                                      )
                                    : ["admin", "member"];
                                  // Asegurar que el rol actual aparezca aunque
                                  // ya no esté en la matriz (defensivo).
                                  const opts = matrixKeys.includes(m.role)
                                    ? matrixKeys
                                    : [...matrixKeys, m.role];
                                  return opts.map((rk) => (
                                    <option key={rk} value={rk}>
                                      {BUILTIN_ROLE_LABELS[rk] ?? rk}
                                    </option>
                                  ));
                                })()}
                              </Select>
                            )}
                            <button
                              onClick={() => handleRemove(w.id, m.id)}
                              disabled={busy || m.role === "owner"}
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

// ─── Filas de la matriz de permisos ───────────────────────────────────────────

const GroupRows = ({
  group,
  keys,
  matrix,
  roleKeys,
  onToggle,
}: {
  group: string;
  keys: { key: string; label: string }[];
  matrix: WsRolePermissions;
  roleKeys: string[];
  onToggle: (role: string, key: string) => void;
}) => {
  const setsByRole: Record<string, Set<string>> = Object.fromEntries(
    roleKeys.map((rk) => [rk, new Set(matrix[rk] ?? [])])
  );
  return (
    <>
      <tr className="bg-surface-el/60">
        <td
          colSpan={roleKeys.length + 1}
          className="px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-muted"
        >
          {group}
        </td>
      </tr>
      {keys.map((k) => (
        <tr key={k.key} className="border-b border-border last:border-0">
          <td className="px-3 py-2 text-text">{k.label}</td>
          {roleKeys.map((rk) => (
            <td key={rk} className="px-2 py-2 text-center">
              <input
                type="checkbox"
                aria-label={`${k.label} — ${BUILTIN_ROLE_LABELS[rk] ?? rk}`}
                checked={setsByRole[rk]?.has(k.key) ?? false}
                onChange={() => onToggle(rk, k.key)}
                className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// ─── Usuarios ─────────────────────────────────────────────────────────────────

const UsersTab = ({
  users,
  workspaces,
  onChange,
}: {
  users: UserRow[];
  workspaces: WsRow[];
  onChange: () => void;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  // Workspaces a los que el user invitado se agrega como member. Por
  // default vacío — admin debe elegir. Sin esto, el user no puede ser
  // asignado a tareas en ningún proyecto (Linear/Notion friction).
  const [inviteWorkspaceIds, setInviteWorkspaceIds] = useState<Set<string>>(
    new Set()
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
      setInviteWorkspaceIds(new Set());
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

            {/* Workspaces multi-select — entornos a los que se agrega el user
                como member al invitarlo. Sin esto, el user no aparece en
                dropdowns de asignar tareas. */}
            <div className="sm:col-span-2 mt-2">
              <p className="mb-2 text-xs font-medium text-text-muted">
                Entornos donde el usuario va a poder trabajar
                {inviteWorkspaceIds.size > 0 && (
                  <span className="ml-1 font-mono text-[11px] tracking-[0.08em] text-ink-faint">
                    ({inviteWorkspaceIds.size} seleccionado{inviteWorkspaceIds.size !== 1 ? "s" : ""})
                  </span>
                )}
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
