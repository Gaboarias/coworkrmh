"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { createPayment, updatePaymentStatus } from "@/lib/actions/clients";

interface ClientOpt {
  id: string;
  companyName: string;
}
interface PaymentItem {
  id: string;
  clientId: string;
  companyName: string;
  description: string;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  dueDate: string | null;
}

const ST: Record<
  string,
  { label: string; variant: "neutral" | "warning" | "success" | "danger" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "neutral" },
};

export function PaymentsPanel({
  clients,
  payments,
}: {
  clients: ClientOpt[];
  payments: PaymentItem[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !description.trim()) {
      toast.error("Cliente y descripción son obligatorios");
      return;
    }
    setSaving(true);
    try {
      await createPayment({
        clientId,
        description: description.trim(),
        amount: Number(amount) || 0,
        currency: "CRC",
        dueDate: dueDate || undefined,
      });
      toast.success("Cobro creado");
      setDescription("");
      setAmount(0);
      setDueDate("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(p: PaymentItem) {
    try {
      await updatePaymentStatus(p.id, p.clientId, "paid");
      toast.success("Marcado como pagado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Nuevo cobro
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              aria-label="Cliente"
            >
              <option value="">Seleccionar cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </Select>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
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
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Vence"
            />
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Crear cobro
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        {payments.length === 0 ? (
          <div className="p-5 text-sm text-text-muted">Sin cobros.</div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => {
              const s = ST[p.status] ?? ST.pending;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {p.description}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {p.companyName}
                      {p.dueDate
                        ? ` · vence ${new Date(
                            p.dueDate
                          ).toLocaleDateString("es-CR")}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm text-text">
                    {p.currency === "CRC" ? "₡" : "$"}
                    {Number(p.amount).toLocaleString("es-CR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                  {p.status !== "paid" && (
                    <button
                      onClick={() => markPaid(p)}
                      aria-label="Marcar pagado"
                      className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-success"
                      title="Marcar pagado"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
