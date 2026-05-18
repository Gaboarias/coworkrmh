"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrendingUp } from "lucide-react";
import { createSale, deleteSale } from "@/lib/actions/sales";
import type { SaleListResult } from "@/lib/actions/sales";

function money(n: number) {
  return `₡${n.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SalesView({
  bucketId,
  data,
  categories,
}: {
  bucketId: string;
  data: SaleListResult;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saleDate, setSaleDate] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!saleDate || !description.trim()) {
      toast.error("Fecha y descripción son obligatorias");
      return;
    }
    setSaving(true);
    const res = await createSale({
      bucketId,
      saleDate,
      description: description.trim(),
      clientName: clientName || undefined,
      categoryId: categoryId || null,
      qty: Number(qty) || 0,
      unitCost: Number(unitCost) || 0,
      unitPrice: Number(unitPrice) || 0,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Venta registrada");
    setDescription("");
    setClientName("");
    setQty(1);
    setUnitCost(0);
    setUnitPrice(0);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta venta?")) return;
    const res = await deleteSale(id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Venta eliminada");
    router.refresh();
  }

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
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              aria-label="Fecha"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
            />
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Cliente"
            />
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label="Categoría"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              aria-label="Cantidad"
              placeholder="Cant."
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              aria-label="Costo unitario"
              placeholder="Costo unit."
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              aria-label="Precio unitario"
              placeholder="Precio unit."
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
              {money(data.totals.sales)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">Ganancia total</p>
            <p className="text-lg font-semibold text-success">
              {money(data.totals.profit)}
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
            description="Registra la primera venta del negocio."
          />
        ) : (
          <div className="divide-y divide-border">
            {data.rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {r.description}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {new Date(r.saleDate).toLocaleDateString("es-CR")} ·{" "}
                    {r.clientName ?? "—"} ·{" "}
                    {r.categoryName ?? "Sin categoría"} · x{r.qty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text">{money(r.total)}</p>
                  <p className="text-xs text-success">+{money(r.profit)}</p>
                </div>
                <button
                  onClick={() => remove(r.id)}
                  aria-label="Eliminar venta"
                  className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger"
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
                    {money(c.sales)} · ganancia{" "}
                    <span className="text-success">{money(c.profit)}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
