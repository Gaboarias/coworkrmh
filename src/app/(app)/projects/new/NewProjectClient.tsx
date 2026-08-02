"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createProject, createBucket } from "@/lib/actions/projects";
import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_ENTORNO_COLOR } from "@/lib/constants/entornoColors";
import { SwatchPicker } from "@/components/ui/SwatchPicker";

interface NewProjectClientProps {
  initialBuckets: { id: string; name: string }[];
}

export function NewProjectClient({ initialBuckets }: NewProjectClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_ENTORNO_COLOR);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      toast.success("Categoría creada");
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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success("Proyecto creado");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl px-8 py-10 md:px-12">
      <BackLink href="/projects">Volver a proyectos</BackLink>
      <PageHeader
        eyebrow="/ proyectos / nuevo"
        title="Nuevo proyecto,"
        subtitle="del estudio."
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="np-name"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Nombre del proyecto *
              </label>
              <Input
                id="np-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Nombre del proyecto"
              />
            </div>

            <div>
              <label
                htmlFor="np-desc"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Descripción
              </label>
              <Textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe el proyecto…"
              />
            </div>

            <div>
              <label
                htmlFor="np-bucket"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Categoría
              </label>
              <div className="flex gap-2">
                <Select
                  id="np-bucket"
                  value={bucketId}
                  onChange={(e) => setBucketId(e.target.value)}
                  className="flex-1"
                >
                  <option value="">Sin categoría</option>
                  {buckets.map((b) => (
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
              <span className="mb-2 block text-sm font-medium text-ink-soft">
                Color
              </span>
              <SwatchPicker value={color} onChange={setColor} label="Color" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="np-start"
                  className="mb-2 block text-sm font-medium text-ink-soft"
                >
                  Inicio
                </label>
                <Input
                  id="np-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="np-end"
                  className="mb-2 block text-sm font-medium text-ink-soft"
                >
                  Fin
                </label>
                <Input
                  id="np-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => router.push("/projects")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={!name.trim()}
              >
                {loading ? "Creando…" : "Crear proyecto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
