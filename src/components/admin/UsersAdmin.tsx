"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UserPlus,
  ChevronDown,
  Copy,
  Check,
  Save,
  Trash2,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { cn } from "@/lib/utils/cn";
import {
  assignMemberProfile,
  type UserWithAssignments,
  type BucketProfilesBundle,
} from "@/lib/actions/profiles";
import { addBucketMember, removeBucketMember } from "@/lib/actions/teams";

export function UsersAdmin({
  users,
  buckets,
  currentUserId,
}: {
  users: UserWithAssignments[];
  buckets: BucketProfilesBundle[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState<{ url: string; emailSent: boolean } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const [addBucketByUser, setAddBucketByUser] = useState<
    Record<string, string>
  >({});

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
      setInvite({ url: data.inviteUrl, emailSent: data.emailSent });
      toast.success(
        data.emailSent ? "Invitado por correo" : "Miembro creado — comparte el enlace"
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

  async function changeRole(userId: string, newRole: string) {
    if (userId === currentUserId) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }
    setSavingRole(userId);
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast.success("Rol global actualizado");
      router.refresh();
    } else toast.error("Error al actualizar rol");
    setSavingRole(null);
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

  async function saveAssignment(
    userId: string,
    bucketId: string,
    patch: {
      profileId: string | null;
      responsibilities: string;
      compensation: string;
      memberStatus: string;
    }
  ) {
    setBusy(`${userId}:${bucketId}`);
    try {
      await assignMemberProfile(bucketId, userId, {
        profileId: patch.profileId,
        responsibilities: patch.responsibilities,
        compensation: patch.compensation,
        memberStatus: patch.memberStatus,
      });
      toast.success("Asignación guardada");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addToBucket(userId: string) {
    const bucketId = addBucketByUser[userId];
    if (!bucketId) return;
    setBusy(`${userId}:add`);
    try {
      await addBucketMember(bucketId, userId);
      toast.success("Agregado al negocio");
      setAddBucketByUser((s) => ({ ...s, [userId]: "" }));
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeFromBucket(userId: string, bucketId: string) {
    if (!confirm("¿Quitar acceso de este usuario a este negocio?")) return;
    setBusy(`${userId}:${bucketId}`);
    try {
      await removeBucketMember(bucketId, userId);
      toast.success("Acceso removido");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <h3 className="mb-1 text-sm font-semibold text-text">
            Agregar miembro
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            Crea la cuenta y comparte el enlace para que defina su contraseña.
          </p>
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo *"
              required
            />
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">Miembro</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
            <Button type="submit" loading={inviting}>
              <UserPlus className="h-4 w-4" />
              Crear invitación
            </Button>
          </form>
          {invite && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface-el p-3">
              <Input readOnly value={invite.url} className="flex-1 text-xs" />
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
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="divide-y divide-border">
          {users.map((u) => {
            const isOpen = expanded === u.id;
            const assignedIds = new Set(u.assignments.map((a) => a.bucketId));
            const addable = buckets.filter((b) => !assignedIds.has(b.id));
            return (
              <div key={u.id}>
                <div className="flex items-center gap-3 p-4">
                  <UserAvatar
                    name={u.name ?? undefined}
                    avatarUrl={u.avatarUrl ?? undefined}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {u.name ?? "Sin nombre"}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-text-tertiary">
                          (tú)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {u.email} · {u.assignments.length} negocio(s)
                    </p>
                  </div>
                  {u.id === currentUserId ? (
                    <RoleBadge role={u.role} />
                  ) : (
                    <Select
                      aria-label={`Rol global de ${u.name ?? u.email}`}
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={savingRole === u.id}
                      className="w-auto pr-8 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="member">Miembro</option>
                    </Select>
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : u.id)}
                    aria-label="Ver asignaciones"
                    className="rounded-md p-1 text-text-tertiary hover:bg-surface-el hover:text-text"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-border bg-surface-el/40 px-4 py-4">
                    {u.assignments.length === 0 && (
                      <p className="text-sm text-text-muted">
                        Sin negocios asignados.
                      </p>
                    )}
                    {u.assignments.map((a) => (
                      <AssignmentEditor
                        key={a.bucketId}
                        userId={u.id}
                        assignment={a}
                        profiles={
                          buckets.find((b) => b.id === a.bucketId)?.profiles ??
                          []
                        }
                        busy={busy === `${u.id}:${a.bucketId}`}
                        onSave={(patch) =>
                          saveAssignment(u.id, a.bucketId, patch)
                        }
                        onRemove={() => removeFromBucket(u.id, a.bucketId)}
                      />
                    ))}
                    {addable.length > 0 && (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-xs font-medium text-text-muted">
                            Agregar a negocio
                          </label>
                          <Select
                            value={addBucketByUser[u.id] ?? ""}
                            onChange={(e) =>
                              setAddBucketByUser((s) => ({
                                ...s,
                                [u.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Seleccionar…</option>
                            {addable.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToBucket(u.id)}
                          disabled={
                            !addBucketByUser[u.id] || busy === `${u.id}:add`
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar
                        </Button>
                      </div>
                    )}
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

function AssignmentEditor({
  assignment,
  profiles,
  busy,
  onSave,
  onRemove,
}: {
  userId: string;
  assignment: {
    bucketId: string;
    bucketName: string;
    profileId: string | null;
    responsibilities: string | null;
    compensation: string | null;
    memberStatus: string;
  };
  profiles: { id: string; name: string }[];
  busy: boolean;
  onSave: (patch: {
    profileId: string | null;
    responsibilities: string;
    compensation: string;
    memberStatus: string;
  }) => void;
  onRemove: () => void;
}) {
  const [profileId, setProfileId] = useState(assignment.profileId ?? "");
  const [responsibilities, setResponsibilities] = useState(
    assignment.responsibilities ?? ""
  );
  const [compensation, setCompensation] = useState(
    assignment.compensation ?? ""
  );
  const [memberStatus, setMemberStatus] = useState(assignment.memberStatus);

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-text">
          {assignment.bucketName}
        </p>
        <button
          onClick={onRemove}
          aria-label="Quitar del negocio"
          className="rounded-md p-1 text-text-tertiary hover:bg-surface-el hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          aria-label="Perfil"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
        >
          <option value="">Sin perfil</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Estado"
          value={memberStatus}
          onChange={(e) => setMemberStatus(e.target.value)}
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </Select>
        <Textarea
          rows={2}
          className="sm:col-span-2"
          value={responsibilities}
          onChange={(e) => setResponsibilities(e.target.value)}
          placeholder="Responsabilidades"
        />
        <Input
          className="sm:col-span-2"
          value={compensation}
          onChange={(e) => setCompensation(e.target.value)}
          placeholder="Compensación"
        />
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          loading={busy}
          onClick={() =>
            onSave({
              profileId: profileId || null,
              responsibilities,
              compensation,
              memberStatus,
            })
          }
        >
          <Save className="h-3.5 w-3.5" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
