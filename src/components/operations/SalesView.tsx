"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { StatStrip } from "@/components/ui/StatStrip";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatMoney } from "@/lib/utils/money";
import { createSale, deleteSale, type SalesResult } from "@/lib/actions/erpSales";
import { formatDateCR } from "@/lib/utils/datetime";
import { DensityToggle } from "./DensityToggle";
import { usePendingRows, pendingRow } from "@/lib/hooks/usePendingRows";

export const SalesView = ({
  data,
  canManage = true,
}: {
  data: SalesResult;
  canManage?: boolean;
}) => {
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

  // Sin UI optimista a propósito: las filas conviven con totales que calcula
  // el servidor. Sacar la fila al instante los dejaría sin mover y la pantalla
  // afirmaría números que no cuadran. Acá se hace legible la espera.
  const { isPending, busy, run } = usePendingRows();

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    await run(id, () => deleteSale(id), {
      success: "Venta eliminada",
      error: "No se pudo eliminar la venta",
    });
  };

  return (
    <div className="space-y-5">
      {canManage && (
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Registrar venta
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Field label="Fecha">
              <Input
                type="date"
                value={f.saleDate}
                onChange={(e) => set({ saleDate: e.target.value })}
                aria-label="Fecha"
              />
            </Field>
            <Field label="Descripción">
              <Input
                value={f.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Ej. Reel para Instagram"
                aria-label="Descripción"
              />
            </Field>
            <Field label="Cliente">
              <Input
                value={f.clientName}
                onChange={(e) => set({ clientName: e.target.value })}
                placeholder="Nombre del cliente"
                aria-label="Cliente"
              />
            </Field>
            <Field label="Categoría">
              <Input
                value={f.category}
                onChange={(e) => set({ category: e.target.value })}
                placeholder="Ej. Producción, Edición"
                aria-label="Categoría"
              />
            </Field>
            <Field label="Cantidad" hint="unidades vendidas">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.qty}
                onChange={(e) => set({ qty: Number(e.target.value) || 0 })}
                aria-label="Cantidad"
              />
            </Field>
            <Field label="Costo unitario" hint="tu costo por unidad">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.unitCost}
                onChange={(e) => set({ unitCost: Number(e.target.value) || 0 })}
                aria-label="Costo unitario"
              />
            </Field>
            <Field label="Precio unitario" hint="lo que le cobrás al cliente">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.unitPrice}
                onChange={(e) => set({ unitPrice: Number(e.target.value) || 0 })}
                aria-label="Precio unitario"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={saving} className="w-full">
                <Plus className="h-4 w-4" />
                Registrar
              </Button>
            </div>
          </form>

          {/* Preview del cálculo — feedback inmediato al user antes de submit */}
          {f.qty > 0 && f.unitPrice > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-md border border-rule bg-surface-el px-4 py-3">
              <CalcStat
                label="Venta total"
                value={formatMoney(f.qty * f.unitPrice)}
              />
              <CalcStat
                label="Costo total"
                value={formatMoney(f.qty * f.unitCost)}
              />
              <CalcStat
                label="Ganancia"
                value={formatMoney(f.qty * (f.unitPrice - f.unitCost))}
                positive={f.unitPrice > f.unitCost}
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <StatStrip
        size="md"
        label="Totales de ventas"
        pending={busy}
        items={[
          { label: "Ventas totales", value: formatMoney(data.totals.sales) },
          {
            label: "Ganancia total",
            value: formatMoney(data.totals.profit),
            tone: "done",
          },
          { label: "Registros", value: data.rows.length },
        ]}
      />

      {data.rows.length > 0 && (
        <div className="mb-2 flex justify-end">
          <DensityToggle />
        </div>
      )}
      <Card>
        {data.rows.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-10 w-10" />}
            title="Sin ventas"
            description="Registrá la primera venta del entorno."
          />
        ) : (
          <div className="divide-y divide-rule">
            {data.rows.map((r) => (
              <div
                key={r.id}
                {...pendingRow(
                  isPending(r.id),
                  "flex items-center gap-4 px-4 py-[var(--erp-row-py)] transition-[background-color,opacity] hover:bg-surface-el"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.description}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {formatDateCR(r.saleDate)} ·{" "}
                    {r.clientName ?? "—"} · {r.category ?? "Sin categoría"} · x
                    {r.qty}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-ink">{formatMoney(r.total)}</p>
                  <p className="text-xs text-done">
                    +{formatMoney(r.profit)}
                  </p>
                </div>
                {canManage && (
                  <IconButton
                    size="lg"
                    tone="danger"
                    onClick={() => remove(r.id)}
                    label="Eliminar venta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.byCategory.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="mb-3 text-sm font-semibold text-ink">
              Resumen por categoría
            </h3>
            <div className="divide-y divide-rule">
              {data.byCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-ink">{c.category}</span>
                  <span className="text-ink-soft">
                    {formatMoney(c.sales)} · ganancia{" "}
                    <span className="text-done">
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

// `FieldWithLabel` vivía acá y subió a `@/components/ui/Field` cuando el
// formulario de Catálogo necesitó lo mismo. De paso se arregló: el `<label>`
// estaba al lado del control y sin `htmlFor`, así que se veía como etiqueta
// pero no lo era — no enfocaba el campo al hacer clic ni lo nombraba para un
// lector de pantalla. Ahora el control va adentro del `<label>`.

function CalcStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <span
        className={
          "text-[13px] font-bold tabular-nums " +
          (positive === false
            ? "text-urgent"
            : positive === true
              ? "text-done"
              : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}
