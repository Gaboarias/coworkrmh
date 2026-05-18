"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PERMISSION_GROUPS } from "@/lib/utils/permissions";
import {
  createProfile,
  updateProfile,
  deleteProfile,
  assignMemberProfile,
  updateTeamAgreements,
} from "@/lib/actions/profiles";

interface ProfileItem {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}
interface MemberItem {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  profileId: string | null;
  responsibilities: string | null;
  compensation: string | null;
  memberStatus: string;
}

export function BucketTeamAdmin({
  bucketId,
  teamAgreements,
  profiles,
  members,
}: {
  bucketId: string;
  teamAgreements: string;
  profiles: ProfileItem[];
  members: MemberItem[];
}) {
  const router = useRouter();

  const [draft, setDraft] = useState<Record<string, ProfileItem>>(
    Object.fromEntries(profiles.map((p) => [p.id, { ...p }]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [agreements, setAgreements] = useState(teamAgreements);
  const [savingAgreements, setSavingAgreements] = useState(false);

  const [memberDraft, setMemberDraft] = useState<Record<string, MemberItem>>(
    Object.fromEntries(members.map((m) => [m.id, { ...m }]))
  );
  const [savingMember, setSavingMember] = useState<string | null>(null);

  useEffect(() => {
    setDraft(Object.fromEntries(profiles.map((p) => [p.id, { ...p }])));
  }, [profiles]);

  useEffect(() => {
    setMemberDraft(
      Object.fromEntries(members.map((m) => [m.id, { ...m }]))
    );
  }, [members]);

  function togglePerm(list: string[], key: string): string[] {
    return list.includes(key)
      ? list.filter((k) => k !== key)
      : [...list, key];
  }

  async function saveProfile(id: string) {
    const p = draft[id];
    setSavingId(id);
    try {
      await updateProfile(id, {
        name: p.name,
        description: p.description,
        permissions: p.permissions,
      });
      toast.success("Perfil actualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeProfile(id: string) {
    if (!confirm("¿Eliminar este perfil? Los miembros con este perfil quedarán sin perfil."))
      return;
    setSavingId(id);
    try {
      await deleteProfile(id);
      toast.success("Perfil eliminado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProfile({
        bucketId,
        name: newName.trim(),
        description: newDesc || undefined,
        permissions: newPerms,
      });
      toast.success("Perfil creado");
      setNewName("");
      setNewDesc("");
      setNewPerms([]);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function saveMember(userId: string) {
    const m = memberDraft[userId];
    setSavingMember(userId);
    try {
      await assignMemberProfile(bucketId, userId, {
        profileId: m.profileId || null,
        responsibilities: m.responsibilities,
        compensation: m.compensation,
        memberStatus: m.memberStatus,
      });
      toast.success("Miembro actualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingMember(null);
    }
  }

  async function saveAgreements() {
    setSavingAgreements(true);
    try {
      await updateTeamAgreements(bucketId, agreements);
      toast.success("Acuerdos guardados");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingAgreements(false);
    }
  }

  function PermGrid({
    selected,
    onToggle,
  }: {
    selected: string[];
    onToggle: (key: string) => void;
  }) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {g.group}
            </p>
            <div className="space-y-1">
              {g.keys.map((k) => (
                <label
                  key={k.key}
                  className="flex items-center gap-2 text-sm text-text"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(k.key)}
                    onChange={() => onToggle(k.key)}
                    className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <h3 className="mb-4 text-sm font-semibold text-text">Perfiles</h3>
          <div className="space-y-5">
            {profiles.map((p) => {
              const d = draft[p.id];
              if (!d) return null;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <div className="min-w-[160px] flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-text-muted">
                        Nombre
                      </label>
                      <Input
                        value={d.name}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            [p.id]: { ...d, name: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="min-w-[200px] flex-[2]">
                      <label className="mb-1.5 block text-xs font-medium text-text-muted">
                        Descripción
                      </label>
                      <Input
                        value={d.description}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            [p.id]: { ...d, description: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <PermGrid
                    selected={d.permissions}
                    onToggle={(key) =>
                      setDraft((s) => ({
                        ...s,
                        [p.id]: {
                          ...d,
                          permissions: togglePerm(d.permissions, key),
                        },
                      }))
                    }
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveProfile(p.id)}
                      loading={savingId === p.id}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeProfile(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                    {p.isSystem && (
                      <span className="text-xs text-text-tertiary">
                        (perfil base)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleCreate}
            className="mt-5 space-y-3 border-t border-border pt-5"
          >
            <h4 className="text-sm font-semibold text-text">Nuevo perfil</h4>
            <div className="flex flex-wrap gap-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del perfil"
                className="min-w-[160px] flex-1"
              />
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripción"
                className="min-w-[200px] flex-[2]"
              />
            </div>
            <PermGrid
              selected={newPerms}
              onToggle={(key) => setNewPerms((s) => togglePerm(s, key))}
            />
            <Button type="submit" loading={creating}>
              <Plus className="h-4 w-4" />
              Crear perfil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-4 text-sm font-semibold text-text">
            Miembros del equipo
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-text-muted">
              Sin miembros. Asigna usuarios desde la lista de negocios.
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((m) => {
                const d = memberDraft[m.id];
                if (!d) return null;
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <UserAvatar
                        name={m.name ?? undefined}
                        avatarUrl={m.avatarUrl ?? undefined}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {m.name ?? m.email}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Perfil
                        </label>
                        <Select
                          value={d.profileId ?? ""}
                          onChange={(e) =>
                            setMemberDraft((s) => ({
                              ...s,
                              [m.id]: {
                                ...d,
                                profileId: e.target.value || null,
                              },
                            }))
                          }
                        >
                          <option value="">Sin perfil</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Estado
                        </label>
                        <Select
                          value={d.memberStatus}
                          onChange={(e) =>
                            setMemberDraft((s) => ({
                              ...s,
                              [m.id]: { ...d, memberStatus: e.target.value },
                            }))
                          }
                        >
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Responsabilidades
                        </label>
                        <Textarea
                          rows={2}
                          value={d.responsibilities ?? ""}
                          onChange={(e) =>
                            setMemberDraft((s) => ({
                              ...s,
                              [m.id]: {
                                ...d,
                                responsibilities: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-text-muted">
                          Compensación
                        </label>
                        <Input
                          value={d.compensation ?? ""}
                          onChange={(e) =>
                            setMemberDraft((s) => ({
                              ...s,
                              [m.id]: { ...d, compensation: e.target.value },
                            }))
                          }
                          placeholder="Ej. % de ganancias / sueldo / por pieza"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => saveMember(m.id)}
                        loading={savingMember === m.id}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-2 text-sm font-semibold text-text">
            Acuerdos clave del equipo
          </h3>
          <Textarea
            rows={6}
            value={agreements}
            onChange={(e) => setAgreements(e.target.value)}
            placeholder="Ej. Porcentaje de ganancias por rol, pago por pieza vs. utilidades, aprobación de diseños…"
          />
          <div className="mt-3">
            <Button onClick={saveAgreements} loading={savingAgreements}>
              <Save className="h-4 w-4" />
              Guardar acuerdos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
