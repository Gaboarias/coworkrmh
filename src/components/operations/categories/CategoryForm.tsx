"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createProductCategory } from "@/lib/actions/products";

export function CategoryForm({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6E83FF");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await createProductCategory({
      bucketId,
      name: name.trim(),
      color,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Categoría creada");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label
          htmlFor="cf-name"
          className="mb-1.5 block text-sm font-medium text-text-muted"
        >
          Nueva categoría
        </label>
        <Input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Muebles"
        />
      </div>
      <div>
        <label
          htmlFor="cf-color"
          className="mb-1.5 block text-sm font-medium text-text-muted"
        >
          Color
        </label>
        <input
          id="cf-color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-surface-el"
        />
      </div>
      <Button type="submit" loading={saving}>
        Agregar
      </Button>
    </form>
  );
}
