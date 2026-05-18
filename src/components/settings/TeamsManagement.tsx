"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronDown, Trash2, UserPlus, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { cn } from "@/lib/utils/cn";
import {
  createBusinessBucket,
  listBucketMembers,
  addBucketMember,
  removeBucketMember,
} from "@/lib/actions/teams";

interface UserOpt {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}
interface BucketOpt {
  id: string;
  name: string;
  color: string | null;
  position: number;
}
interface Member {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "manager" | "member";
}

export function TeamsManagement({
  buckets,
  allUsers,
}: {
  buckets: BucketOpt[];
  allUsers: UserOpt[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6E83FF");
  const [creating, setCreating] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [membersByBucket, setMembersByBucket] = useState<
    Record<string, Member[]>
  >({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addUser, setAddUser] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "manager" | "member">(
    "member"
  );
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createBusinessBucket({ name: name.trim(), color });
      toast.success("Negocio creado");
      setName("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleExpand(bucketId: string) {
    if (expanded === bucketId) {
      setExpanded(null);
      return;
    }
    setExpanded(bucketId);
    setAddUser("");
    if (!membersByBucket[bucketId]) {
      setLoadingMembers(true);
      try {
        const members = (await listBucketMembers(bucketId)) as Member[];
        setMembersByBucket((p) => ({ ...p, [bucketId]: members }));
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setLoadingMembers(false);
      }
    }
  }

  async function refreshMembers(bucketId: string) {
    const members = (await listBucketMembers(bucketId)) as Member[];
    setMembersByBucket((p) => ({ ...p, [bucketId]: members }));
  }

  async function handleAdd(bucketId: string) {
    if (!addUser) return;
    setBusy(true);
    try {
      await addBucketMember(bucketId, addUser, addRole);
      toast.success("Acceso otorgado");
      setAddUser("");
      await refreshMembers(bucketId);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(bucketId: string, userId: string) {
    setBusy(true);
    try {
      await removeBucketMember(bucketId, userId);
      toast.success("Acceso removido");
      await refreshMembers(bucketId);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Crear negocio / equipo
          </h3>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="tg-name"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Nombre
              </label>
              <Input
                id="tg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Azulejos & Colores"
              />
            </div>
            <div>
              <label
                htmlFor="tg-color"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Color
              </label>
              <input
                id="tg-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-surface-el"
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
          {buckets.map((b) => {
            const members = membersByBucket[b.id] ?? [];
            const memberIds = new Set(members.map((m) => m.id));
            const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));
            const isOpen = expanded === b.id;
            return (
              <div key={b.id}>
                <button
                  onClick={() => toggleExpand(b.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-el"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: b.color ?? "#6B5FE4" }}
                  >
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-text">
                    {b.name}
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
                          Usuario
                        </label>
                        <Select
                          aria-label="Usuario"
                          value={addUser}
                          onChange={(e) => setAddUser(e.target.value)}
                        >
                          <option value="">Seleccionar…</option>
                          {nonMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.email}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Rol
                        </label>
                        <Select
                          aria-label="Rol"
                          value={addRole}
                          onChange={(e) =>
                            setAddRole(
                              e.target.value as "admin" | "manager" | "member"
                            )
                          }
                        >
                          <option value="member">Miembro</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(b.id)}
                        disabled={!addUser || busy}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Dar acceso
                      </Button>
                    </div>

                    <div className="space-y-1">
                      {loadingMembers && !membersByBucket[b.id] ? (
                        <p className="px-1 py-2 text-sm text-text-muted">
                          Cargando…
                        </p>
                      ) : members.length === 0 ? (
                        <p className="px-1 py-2 text-sm text-text-muted">
                          Nadie tiene acceso a este negocio todavía.
                        </p>
                      ) : (
                        members.map((m) => (
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
                            <RoleBadge role={m.role} />
                            <button
                              onClick={() => handleRemove(b.id, m.id)}
                              disabled={busy}
                              aria-label={`Quitar acceso a ${m.name ?? m.email}`}
                              className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger"
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
}
