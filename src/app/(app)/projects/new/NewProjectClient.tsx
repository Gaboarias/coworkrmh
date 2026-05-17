"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject, createBucket } from "@/lib/actions/projects";
import { PageHeader } from "@/components/shared/PageHeader";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const COLORS = [
  "#6B5FE4", "#E4845F", "#4ADE80", "#FBBF24",
  "#60A5FA", "#F87171", "#A78BFA", "#34D399",
];

interface NewProjectClientProps {
  initialBuckets: { id: string; name: string }[];
}

export function NewProjectClient({ initialBuckets }: NewProjectClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [dueDate, setDueDate] = useState("");
  const [buckets, setBuckets] = useState(initialBuckets);
  const [loading, setLoading] = useState(false);
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  async function handleCreateBucket() {
    if (!newBucketName.trim()) return;
    try {
      const bucket = await createBucket({ name: newBucketName, color });
      setBuckets((prev) => [...prev, bucket]);
      setBucketId(bucket.id);
      setNewBucketName("");
      setShowNewBucket(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const project = await createProject({
        name: name.trim(),
        description: description || undefined,
        bucketId: bucketId || undefined,
        color,
        dueDate: dueDate || undefined,
      });
      toast.success("Proyecto creado");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href="/projects"
          className="mb-4 flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <PageHeader title="Nuevo proyecto" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nombre del proyecto"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Describe el proyecto..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Bucket / Categoría
            </label>
            <div className="flex gap-2">
              <select
                value={bucketId}
                onChange={(e) => setBucketId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewBucket(!showNewBucket)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:bg-surface-el"
              >
                <Plus className="h-3 w-3" />
                Nuevo
              </button>
            </div>

            {showNewBucket && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="Nombre del bucket"
                  className="flex-1 rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateBucket())}
                />
                <button
                  type="button"
                  onClick={handleCreateBucket}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  Crear
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg transition ${
                    color === c ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Fecha límite
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/projects"
              className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm text-text-muted hover:bg-surface-el"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
