"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2, Check, X, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tags } from "lucide-react";
import { CategoryForm } from "./CategoryForm";
import {
  updateProductCategory,
  deleteProductCategory,
  type ProductCategory,
} from "@/lib/actions/products";

export function CategoryList({
  bucketId,
  categories,
}: {
  bucketId: string;
  categories: ProductCategory[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function saveEdit(id: string) {
    setBusy(id);
    const res = await updateProductCategory({ id, name: editName.trim() });
    setBusy(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Categoría actualizada");
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los productos quedarán sin categoría."))
      return;
    setBusy(id);
    const res = await deleteProductCategory(id);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.data.affectedProducts > 0
        ? `Categoría eliminada (${res.data.affectedProducts} producto(s) sin categoría)`
        : "Categoría eliminada"
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <CategoryForm bucketId={bucketId} />
        </CardContent>
      </Card>

      <Card>
        {categories.length === 0 ? (
          <EmptyState
            icon={<Tags className="h-10 w-10" />}
            title="Sin categorías"
            description="Crea la primera categoría para organizar tus productos."
          />
        ) : (
          <div className="divide-y divide-border">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: c.color ?? "#6B5FE4" }}
                />
                {editing === c.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveEdit(c.id)}
                      loading={busy === c.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-text">
                      {c.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(c.id);
                        setEditName(c.name);
                      }}
                      aria-label={`Editar ${c.name}`}
                      className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-text"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      aria-label={`Eliminar ${c.name}`}
                      className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
