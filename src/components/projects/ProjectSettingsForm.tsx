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
import { DEFAULT_ENTORNO_COLOR } from "@/lib/constants/entornoColors";
import { SwatchPicker } from "@/components/ui/SwatchPicker";

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
    visibility: "workspace" | "members";
  };
  members: Profile[];
  allUsers: Profile[];
  buckets: { id: string; name: string }[];
}

// Paleta canónica Edition 04 — compartida con EntornoSwitcher y NewProject

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
    color: project.color ?? DEFAULT_ENTORNO_COLOR,
    status: project.status,
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  // Fuera del form principal: cambiar quién ve el proyecto se guarda solo, sin
  // "Guardar cambios". Es un interruptor de acceso — dejarlo pendiente en un
  // formulario a medio llenar sería no saber en qué estado quedó.
  const [visibility, setVisibility] = useState(project.visibility);
  const [savingVisibility, setSavingVisibility] = useState(false);
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

  async function handleVisibility(next: "workspace" | "members") {
    if (next === visibility) return;
    const prev = visibility;
    setVisibility(next); // optimista: el radio tiene que responder al toque
    setSavingVisibility(true);
    try {
      await updateProject(project.id, { visibility: next });
      toast.success(
        next === "members"
          ? "Ahora sólo lo ve el equipo del proyecto"
          : "Ahora lo ve todo el entorno"
      );
      // refresh y no sólo estado local: cambiar esto reordena la lista de
      // proyectos y el dashboard de todos los demás.
      router.refresh();
    } catch (err) {
      setVisibility(prev);
      toast.error((err as Error).message);
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    try {
      const next: ProjectStatus = isArchived ? "active" : "archived";
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
          <h3 className="mb-4 text-sm font-semibold text-ink">
            Información del proyecto
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="ps-name"
                className="mb-2 block text-sm font-medium text-ink-soft"
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
                className="mb-2 block text-sm font-medium text-ink-soft"
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

            <div>
              <div>
                <label
                  htmlFor="ps-bucket"
                  className="mb-2 block text-sm font-medium text-ink-soft"
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
                  {form.bucketId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((p) => ({ ...p, bucketId: "" }))
                      }
                      title="Quitar categoría — el proyecto queda 'Sin categoría'"
                    >
                      Quitar
                    </Button>
                  )}
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

              {/*
                Campo Estado escondido — la organización del proyecto ahora
                pasa por la Categoría (bucket). El status queda en DB pero
                no se edita desde acá; el botón Archivar/Reactivar de más
                abajo cubre los únicos cambios de estado que hacen falta.
              */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ps-start"
                  className="mb-2 block text-sm font-medium text-ink-soft"
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
                  className="mb-2 block text-sm font-medium text-ink-soft"
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
              <span className="mb-2 block text-sm font-medium text-ink-soft">
                Color
              </span>
              <SwatchPicker
                value={form.color}
                onChange={(c) => setForm((p) => ({ ...p, color: c }))}
                label="Color"
              />
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
          <h3 className="mb-1 text-sm font-semibold text-ink">
            Miembros del proyecto
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-ink-soft">
            Quien esté acá recibe las notificaciones del proyecto. Además, si
            abajo lo restringís, sólo esta gente lo ve.
          </p>

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
                  <p className="truncate text-sm font-medium text-ink">
                    {member.name ?? member.email}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {member.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  aria-label={`Remover a ${member.name ?? member.email}`}
                  className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface hover:text-urgent"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 text-sm font-semibold text-ink">
            Quién ve este proyecto
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-ink-soft">
            Cambia si el proyecto aparece en la lista, el dashboard, el
            calendario y la búsqueda de quienes no trabajan en él.
          </p>

          <div className="space-y-2">
            <VisibilityOption
              value="workspace"
              current={visibility}
              onChange={handleVisibility}
              busy={savingVisibility}
              title="Todo el entorno"
              detail="Cualquiera del entorno lo ve. Es como funcionó siempre."
            />
            <VisibilityOption
              value="members"
              current={visibility}
              onChange={handleVisibility}
              busy={savingVisibility}
              title="Sólo el equipo del proyecto"
              // Decirlo con todas las letras: quien administra proyectos lo
              // sigue viendo. Si no, el día que se va el último miembro el
              // proyecto queda sin nadie que pueda entrar. Una etiqueta de
              // "privado" que no es privada es peor que no tener la función.
              detail="Los miembros de arriba, más quienes administran proyectos en el entorno. No es un proyecto secreto: es sacarlo de la vista de quien no trabaja en él."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VisibilityOption({
  value,
  current,
  onChange,
  busy,
  title,
  detail,
}: {
  value: "workspace" | "members";
  current: string;
  onChange: (v: "workspace" | "members") => void;
  busy: boolean;
  title: string;
  detail: string;
}) {
  const active = current === value;
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-md border p-3 transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-rule hover:bg-surface-el",
        busy && "pointer-events-none opacity-60"
      )}
    >
      <input
        type="radio"
        name="project-visibility"
        className="mt-1"
        checked={active}
        disabled={busy}
        onChange={() => onChange(value)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
          {detail}
        </span>
      </span>
    </label>
  );
}
