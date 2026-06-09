"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatMoney } from "@/lib/utils/money";
import {
  createExpense,
  deleteExpense,
  setBreakEvenMargin,
  type ExpensesResult,
} from "@/lib/actions/erp";

// ── Subcomponente de sección ──────────────────────────────────────────────────
// Definido en scope de módulo para que React mantenga identidad estable entre
// renders del padre y no fuerce un unmount/remount en cada actualización.
function ExpensesSection({
  title,
  total,
  rows,
  canManage,
  onRemove,
}: {
  title: string;
  total: number;
  rows: ExpensesResult["investment"];
  canManage: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <span className="text-sm font-semibold text-text">
            {formatMoney(total)}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">Sin registros.</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 text-text">{e.concept}</span>
                <span className="text-xs text-text-tertiary">
                  {e.category ?? "—"}
                  {e.priority ? ` · ${e.priority}` : ""}
                </span>
                <span className="text-text">{formatMoney(e.amount)}</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRemove(e.id)}
                    aria-label="Eliminar"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export const ExpensesView = ({
  data,
  canManage = true,
}: {
  data: ExpensesResult;
  canManage?: boolean;
}) => {
  const router = useRouter();
  const [kind, setKind] = useState<"investment" | "fixed">("investment");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("media");
  const [saving, setSaving] = useState(false);
  const [margin, setMargin] = useState(data.breakEvenMargin);
  const [savingMargin, setSavingMargin] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) {
      toast.error("Falta el concepto");
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        kind,
        concept,
        amount,
        category: category || undefined,
        priority: kind === "investment" ? priority : undefined,
      });
      toast.success("Registrado");
      setConcept("");
      setAmount(0);
      setCategory("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    try {
      await deleteExpense(id);
      toast.success("Eliminado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveMargin = async () => {
    setSavingMargin(true);
    try {
      await setBreakEvenMargin(margin);
      toast.success("Margen actualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingMargin(false);
    }
  };

  return (
    <div className="space-y-5">
      {canManage && (
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Registrar gasto / inversión
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "investment" | "fixed")
              }
              aria-label="Tipo"
            >
              <option value="investment">Inversión inicial</option>
              <option value="fixed">Gasto fijo mensual</option>
            </Select>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Concepto"
              aria-label="Concepto"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Monto"
              aria-label="Monto"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría (Equipos, Materiales…)"
              aria-label="Categoría"
            />
            {kind === "investment" && (
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-label="Prioridad"
              >
                <option value="alta">Prioridad alta</option>
                <option value="media">Prioridad media</option>
                <option value="baja">Prioridad baja</option>
              </Select>
            )}
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      <ExpensesSection
        title="Inversión inicial"
        total={data.totalInvestment}
        rows={data.investment}
        canManage={canManage}
        onRemove={remove}
      />
      <ExpensesSection
        title="Gastos fijos mensuales"
        total={data.totalFixed}
        rows={data.fixed}
        canManage={canManage}
        onRemove={remove}
      />

      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Punto de equilibrio mensual
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="expenses-margin" className="mb-1.5 block text-xs font-medium text-text-muted">
                Margen promedio (0–1)
              </label>
              <Input
                id="expenses-margin"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value) || 0)}
                className="w-32"
                disabled={!canManage}
              />
            </div>
            {canManage && (
              <Button size="sm" onClick={saveMargin} loading={savingMargin}>
                Guardar margen
              </Button>
            )}
            <div className="ml-auto text-right">
              <p className="text-xs text-text-muted">
                Ventas necesarias para cubrir gastos fijos
              </p>
              <p className="text-lg font-semibold text-primary">
                {formatMoney(data.breakEvenSales)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
