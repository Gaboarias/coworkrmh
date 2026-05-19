"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatMoney } from "@/lib/utils/money";
import { createSale, deleteSale, type SalesResult } from "@/lib/actions/erp";

export const SalesView = ({ data }: { data: SalesResult }) => {
  const router = useRouter();
  const [f, setF] = useState({
    saleDate: "",
    description: "",
    clientName: "",
    category: "",
    qty: 1,
    unitCost: 0,
    unitPrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.saleDate || !f.description.trim()) {
      toast.error("Fecha y descripción son obligatorias");
      return;
    }
    setSaving(true);
    try {
      await createSale(f);
      toast.success("Venta registrada");
      setF({
        saleDate: "",
        description: "",
        clientName: "",
        category: "",
        qty: 1,
        unitCost: 0,
        unitPrice: 0,
      });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      await deleteSale(id);
      toast.success("Venta eliminada");
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
            Registrar venta
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={f.saleDate}
              onChange={(e) => set({ saleDate: e.target.value })}
              aria-label="Fecha"
            />
            <Input
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Descripción"
              aria-label="Descripción"
            />
            <Input
              value={f.clientName}
              onChange={(e) => set({ clientName: e.target.value })}
              placeholder="Cliente"
              aria-label="Cliente"
            />
            <Input
              value={f.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="Categoría"
              aria-label="Categoría"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={f.qty}
              onChange={(e) => set({ qty: Number(e.target.value) || 0 })}
              placeholder="Cant."
              aria-label="Cantidad"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={f.unitCost}
              onChange={(e) => set({ unitCost: Number(e.target.value) || 0 })}
              placeholder="Costo unit."
              aria-label="Costo unitario"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={f.unitPrice}
              onChange={(e) => set({ unitPrice: Number(e.target.value) || 0 })}
              placeholder="Precio unit."
              aria-label="Precio unitario"
            />
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">Ventas totales</p>
            <p className="text-lg font-semibold text-text">
              {formatMoney(data.totals.sales)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">Ganancia total</p>
            <p className="text-lg font-semibold text-success">
              {formatMoney(data.totals.profit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">Registros</p>
            <p className="text-lg font-semibold text-text">
              {data.rows.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        {data.rows.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-10 w-10" />}
            title="Sin ventas"
            description="Registrá la primera venta del entorno."
          />
        ) : (
          <div className="divide-y divide-border">
            {data.rows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-el">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {r.description}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {new Date(r.saleDate).toLocaleDateString("es-CR")} ·{" "}
                    {r.clientName ?? "—"} · {r.category ?? "Sin categoría"} · x
                    {r.qty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text">{formatMoney(r.total)}</p>
                  <p className="text-xs text-success">
                    +{formatMoney(r.profit)}
                  </p>
                </div>
                <button
                  onClick={() => remove(r.id)}
                  aria-label="Eliminar venta"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.byCategory.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="mb-3 text-sm font-semibold text-text">
              Resumen por categoría
            </h3>
            <div className="divide-y divide-border">
              {data.byCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-text">{c.category}</span>
                  <span className="text-text-muted">
                    {formatMoney(c.sales)} · ganancia{" "}
                    <span className="text-success">
                      {formatMoney(c.profit)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
