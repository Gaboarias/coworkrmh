"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProject, addProjectMember, removeProjectMember } from "@/lib/actions/projects";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Trash2, UserPlus } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface ProjectSettingsFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    bucket_id: string | null;
    color: string | null;
    status: "active" | "archived" | "completed";
  };
  members: Profile[];
  allUsers: Profile[];
  buckets: { id: string; name: string }[];
}

const COLORS = [
  "#6B5FE4", "#E4845F", "#4ADE80", "#FBBF24",
  "#60A5FA", "#F87171", "#A78BFA", "#34D399",
];

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
    bucket_id: project.bucket_id ?? "",
    color: project.color ?? COLORS[0],
    status: project.status,
  });
  const [saving, setSaving] = useState(false);
  const [addingUser, setAddingUser] = useState("");

  const memberIds = new Set(members.map((m) => m.id));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: form.name,
        description: form.description || null,
        bucket_id: form.bucket_id || null,
        color: form.color,
        status: form.status,
      });
      toast.success("Proyecto actualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
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

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      {/* Project info */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-4 font-semibold text-text">Información del proyecto</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Bucket
              </label>
              <select
                value={form.bucket_id}
                onChange={(e) => setForm((p) => ({ ...p, bucket_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Sin categoría</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                className={inputClass}
              >
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`h-7 w-7 rounded-lg transition ${
                    form.color === c
                      ? "ring-2 ring-white ring-offset-1 ring-offset-background"
                      : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-4 font-semibold text-text">Miembros del proyecto</h3>

        <div className="mb-4 flex gap-2">
          <select
            value={addingUser}
            onChange={(e) => setAddingUser(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="">Seleccionar usuario...</option>
            {nonMembers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddMember}
            disabled={!addingUser}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-el"
            >
              <UserAvatar
                name={member.full_name}
                avatarUrl={member.avatar_url}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {member.full_name ?? member.email}
                </p>
                <p className="truncate text-xs text-text-muted">{member.email}</p>
              </div>
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="text-text-tertiary hover:text-danger"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
