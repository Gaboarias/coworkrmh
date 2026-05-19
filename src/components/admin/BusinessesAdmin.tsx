"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createBusinessBucket } from "@/lib/actions/teams";

interface BucketItem {
  id: string;
  name: string;
  color: string | null;
}

export function BusinessesAdmin({ buckets }: { buckets: BucketItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6E83FF");
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Crear negocio
          </h3>
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Nombre
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Azulejos & Colores"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Color
              </label>
              <input
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
          {buckets.length === 0 ? (
            <p className="p-5 text-sm text-text-muted">Sin negocios.</p>
          ) : (
            buckets.map((b) => (
              <Link
                key={b.id}
                href={`/admin/negocios/${b.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-el"
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
                <span className="text-xs text-text-muted">
                  Perfiles · permisos · equipo
                </span>
                <ChevronRight className="h-4 w-4 text-text-tertiary" />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
