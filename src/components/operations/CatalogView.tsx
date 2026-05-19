"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Package } from "lucide-react";
import { formatMoney } from "@/lib/utils/money";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductRow,
} from "@/lib/actions/erp";

interface Draft {
  name: string;
  category: string;
  materialsCost: number;
  laborCost: number;
  price: number;
}
const empty: Draft = {
  name: "",
  category: "",
  materialsCost: 0,
  laborCost: 0,
  price: 0,
};

const Fields = ({
  d,
  set,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
}) => (
  <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_repeat(3,0.9fr)]">
    <Input
      value={d.name}
      onChange={(e) => set({ name: e.target.value })}
      placeholder="Producto"
      aria-label="Producto"
    />
    <Input
      value={d.category}
      onChange={(e) => set({ category: e.target.value })}
      placeholder="Categoría"
      aria-label="Categoría"
    />
    <Input
      type="number"
      step="0.01"
      min="0"
      value={d.materialsCost}
      onChange={(e) => set({ materialsCost: Number(e.target.value) || 0 })}
      placeholder="Materiales"
      aria-label="Costo materiales"
    />
    <Input
      type="number"
      step="0.01"
      min="0"
      value={d.laborCost}
      onChange={(e) => set({ laborCost: Number(e.target.value) || 0 })}
      placeholder="Mano obra"
      aria-label="Costo mano de obra"
    />
    <Input
      type="number"
      step="0.01"
      min="0"
      value={d.price}
      onChange={(e) => set({ price: Number(e.target.value) || 0 })}
      placeholder="Precio"
      aria-label="Precio venta"
    />
  </div>
);

export const CatalogView = ({ products }: { products: ProductRow[] }) => {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setCreating(true);
    try {
      await createProduct(draft);
      toast.success("Producto agregado");
      setDraft(empty);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: ProductRow) => {
    setEditId(p.id);
    setEditDraft({
      name: p.name,
      category: p.category ?? "",
      materialsCost: p.materialsCost,
      laborCost: p.laborCost,
      price: p.price,
    });
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      await updateProduct(id, editDraft);
      toast.success("Producto actualizado");
      setEditId(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteProduct(id);
      toast.success("Producto eliminado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Agregar producto
          </h3>
          <form onSubmit={add} className="space-y-3">
            <Fields d={draft} set={(p) => setDraft((s) => ({ ...s, ...p }))} />
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-tertiary">
                Costo total = materiales + mano de obra · margen = ganancia /
                precio
              </p>
              <Button type="submit" loading={creating}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        {products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10" />}
            title="Sin productos"
            description="Agregá el primer producto del catálogo."
          />
        ) : (
          <div className="divide-y divide-border">
            {products.map((p) =>
              editId === p.id ? (
                <div key={p.id} className="space-y-3 bg-surface-el/40 p-4">
                  <Fields
                    d={editDraft}
                    set={(x) => setEditDraft((s) => ({ ...s, ...x }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(p.id)}
                      loading={busy}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-surface-el"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{p.name}</p>
                    <p className="truncate text-xs text-text-muted">
                      {p.category ?? "Sin categoría"} · costo{" "}
                      {formatMoney(p.totalCost)}
                    </p>
                  </div>
                  <span className="hidden w-28 text-right text-text sm:block">
                    {formatMoney(p.price)}
                  </span>
                  <span
                    className={`w-16 text-right font-medium ${
                      p.marginPct >= 0.4
                        ? "text-success"
                        : p.marginPct >= 0.15
                          ? "text-warning"
                          : "text-danger"
                    }`}
                  >
                    {Math.round(p.marginPct * 100)}%
                  </span>
                  <button
                    onClick={() => startEdit(p)}
                    aria-label={`Editar ${p.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-text"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label={`Eliminar ${p.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
