"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, UserPlus, Archive, RotateCcw, Plus } from "lucide-react";
import {
  updateProject,
  addProjectMember,
  removeProjectMember,
  createBucket,
} from "@/lib/actions/projects";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { ProjectStatus } from "@/lib/types";
import {
  PROJECT_STATUS_ORDER,
  PROJECT_STATUS_CONFIG,
} from "@/lib/constants/projectStatus";
import { ENTORNO_SWATCHES } from "@/lib/constants/entornoColors";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface ProjectSettingsFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    bucketId: string | null;
    color: string | null;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
  };
  members: Profile[];
  allUsers: Profile[];
  buckets: { id: string; name: string }[];
}

// Paleta canónica Edition 04 — compartida con EntornoSwitcher y NewProject
const COLORS = ENTORNO_SWATCHES;

export function ProjectSettingsForm({
  project,
  members,
  allUsers,
  buckets,
}: ProjectSettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    bucketId: project.bucketId ?? "",
    color: project.color ?? COLORS[0],
    status: project.status,
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [addingUser, setAddingUser] = useState("");
  const [bucketList, setBucketList] = useState(buckets);
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const isArchived = project.status === "archived";

  async function handleCreateBucket() {
    if (!newBucketName.trim()) return;
    try {
      const bucket = await createBucket({
        name: newBucketName.trim(),
        color: form.color,
      });
      setBucketList((prev) => [...prev, { id: bucket.id, name: bucket.name }]);
      setForm((p) => ({ ...p, bucketId: bucket.id }));
      setNewBucketName("");
      setShowNewBucket(false);
      toast.success("Categoría creada");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const memberIds = new Set(members.map((m) => m.id));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: form.name,
        description: form.description || null,
        bucketId: form.bucketId || null,
        color: form.color,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      toast.success("Proyecto actualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    try {
      const next: ProjectStatus = isArchived ? "prospecto" : "archived";
      await updateProject(project.id, { status: next });
      toast.success(isArchived ? "Proyecto reactivado" : "Proyecto archivado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setArchiving(false);
    }
  }

  async function handleAddMember() {
    if (!addingUser) return;
    try {
      await addProjectMember(project.id, addingUser);
      toast.success("Miembro agregado");
      setAddingUser("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("¿Remover este miembro del proyecto?")) return;
    try {
      await removeProjectMember(project.id, userId);
      toast.success("Miembro removido");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text">
            Información del proyecto
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="ps-name"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Nombre
              </label>
              <Input
                id="ps-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label
                htmlFor="ps-desc"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Descripción
              </label>
              <Textarea
                id="ps-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ps-bucket"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Categoría
                </label>
                <div className="flex gap-2">
                  <Select
                    id="ps-bucket"
                    value={form.bucketId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, bucketId: e.target.value }))
                    }
                    className="flex-1"
                  >
                    <option value="">Sin categoría</option>
                    {bucketList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewBucket(!showNewBucket)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva
                  </Button>
                </div>
                {showNewBucket && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newBucketName}
                      onChange={(e) => setNewBucketName(e.target.value)}
                      placeholder="Nombre de la categoría"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleCreateBucket())
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateBucket}
                    >
                      Crear
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="ps-status"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Estado
                </label>
                <Select
                  id="ps-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as ProjectStatus,
                    }))
                  }
                >
                  {PROJECT_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_STATUS_CONFIG[s].label}
                    </option>
                  ))}
                  <option value="archived">
                    {PROJECT_STATUS_CONFIG.archived.label}
                  </option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ps-start"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Fecha de inicio
                </label>
                <Input
                  id="ps-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="ps-end"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Fecha de fin
                </label>
                <Input
                  id="ps-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-text-muted">
                Color
              </span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={cn(
                      "h-7 w-7 rounded-lg transition-transform hover:scale-110",
                      form.color === c &&
                        "ring-2 ring-text ring-offset-2 ring-offset-surface"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" loading={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant={isArchived ? "outline" : "ghost"}
                loading={archiving}
                onClick={handleArchiveToggle}
              >
                {isArchived ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reactivar
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Archivar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text">
            Miembros del proyecto
          </h3>

          <div className="mb-4 flex gap-2">
            <Select
              aria-label="Seleccionar usuario"
              value={addingUser}
              onChange={(e) => setAddingUser(e.target.value)}
              className="flex-1"
            >
              <option value="">Seleccionar usuario…</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </Select>
            <Button onClick={handleAddMember} disabled={!addingUser}>
              <UserPlus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-el"
              >
                <UserAvatar
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {member.name ?? member.email}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {member.email}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  aria-label={`Remover a ${member.name ?? member.email}`}
                  className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface hover:text-danger"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
