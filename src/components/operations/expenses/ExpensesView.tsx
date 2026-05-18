"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createExpense,
  deleteExpense,
  setBreakEvenMargin,
  type ExpenseSummary,
} from "@/lib/actions/expenses";

function money(n: number) {
  return `₡${n.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ExpensesView({
  bucketId,
  data,
}: {
  bucketId: string;
  data: ExpenseSummary;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"investment" | "fixed_monthly">(
    "investment"
  );
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("media");
  const [saving, setSaving] = useState(false);
  const [margin, setMargin] = useState(data.breakEvenMargin);
  const [savingMargin, setSavingMargin] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim()) {
      toast.error("Falta el concepto");
      return;
    }
    setSaving(true);
    const res = await createExpense({
      bucketId,
      kind,
      concept: concept.trim(),
      amount: Number(amount) || 0,
      category: category || undefined,
      priority:
        kind === "investment"
          ? (priority as "alta" | "media" | "baja")
          : undefined,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Gasto registrado");
    setConcept("");
    setAmount(0);
    setCategory("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await deleteExpense(id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Gasto eliminado");
    router.refresh();
  }

  async function saveMargin() {
    setSavingMargin(true);
    const res = await setBreakEvenMargin(bucketId, Number(margin) || 0);
    setSavingMargin(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Margen actualizado");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Registrar gasto / inversión
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "investment" | "fixed_monthly")
              }
              aria-label="Tipo"
            >
              <option value="investment">Inversión inicial</option>
              <option value="fixed_monthly">Gasto fijo mensual</option>
            </Select>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Concepto"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Monto"
              aria-label="Monto"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría (Equipos, Materiales…)"
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

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Inversión inicial
            </h3>
            <span className="text-sm font-semibold text-text">
              {money(data.totalInvestment)}
            </span>
          </div>
          {data.investment.length === 0 ? (
            <p className="text-sm text-text-muted">Sin inversiones.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.investment.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <span className="flex-1 text-text">{e.concept}</span>
                  <span className="text-xs text-text-tertiary">
                    {e.category ?? "—"} · {e.priority ?? "—"}
                  </span>
                  <span className="text-text">{money(e.amount)}</span>
                  <button
                    onClick={() => remove(e.id)}
                    aria-label="Eliminar"
                    className="text-text-tertiary hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Gastos fijos mensuales
            </h3>
            <span className="text-sm font-semibold text-text">
              {money(data.totalFixedMonthly)}
            </span>
          </div>
          {data.fixedMonthly.length === 0 ? (
            <p className="text-sm text-text-muted">Sin gastos fijos.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.fixedMonthly.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <span className="flex-1 text-text">{e.concept}</span>
                  <span className="text-xs text-text-tertiary">
                    {e.category ?? "—"}
                  </span>
                  <span className="text-text">{money(e.amount)}</span>
                  <button
                    onClick={() => remove(e.id)}
                    aria-label="Eliminar"
                    className="text-text-tertiary hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Punto de equilibrio mensual
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Margen promedio (0–1)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Button size="sm" onClick={saveMargin} loading={savingMargin}>
              Guardar margen
            </Button>
            <div className="ml-auto text-right">
              <p className="text-xs text-text-muted">
                Ventas necesarias para cubrir gastos fijos
              </p>
              <p className="text-lg font-semibold text-primary">
                {money(data.breakEvenSales)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
