"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, ChevronLeft } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { createPayment, updatePaymentStatus } from "@/lib/actions/clients";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface Payment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  dueDate: string | null;
  paidAt: string | null;
  projectId: string | null;
}

interface PaymentsViewProps {
  client: { id: string; companyName: string };
  payments: Payment[];
  projects: { id: string; name: string }[];
}

const statusMeta: Record<
  Payment["status"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "neutral" },
};

const tabs = (clientId: string) => [
  { href: `/crm/${clientId}`, label: "Perfil" },
  { href: `/crm/${clientId}/payments`, label: "Pagos", active: true },
  { href: `/crm/${clientId}/accounts`, label: "Cuentas" },
];

export function PaymentsView({
  client,
  payments,
  projects,
}: PaymentsViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    currency: "USD",
    dueDate: "",
    projectId: "",
  });

  const pending = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue"
  );
  const done = payments.filter(
    (p) => p.status === "paid" || p.status === "cancelled"
  );
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPayment({
        clientId: client.id,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        dueDate: form.dueDate || undefined,
        projectId: form.projectId || undefined,
      });
      toast.success("Pago registrado");
      setShowForm(false);
      setForm({
        description: "",
        amount: "",
        currency: "USD",
        dueDate: "",
        projectId: "",
      });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(
    paymentId: string,
    status: Payment["status"]
  ) {
    try {
      await updatePaymentStatus(paymentId, client.id, status);
      router.refresh();
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Clientes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {client.companyName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">Pagos y facturación</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Nuevo pago
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(client.id).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {pending.length > 0 && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-warning/30 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] px-4 py-3"
        >
          <p className="text-sm font-medium text-warning">
            {pending.length} pago{pending.length > 1 ? "s" : ""} pendiente
            {pending.length > 1 ? "s" : ""} ·{" "}
            <span className="font-mono">
              USD {totalPending.toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-text">
              Registrar pago
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="p-desc" className="sr-only">
                  Descripción
                </label>
                <Input
                  id="p-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Descripción del pago"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="Monto"
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="Monto"
                  required
                  min="0"
                  step="0.01"
                />
                <Select
                  aria-label="Moneda"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, currency: e.target.value }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="Fecha de vencimiento"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                />
                <Select
                  aria-label="Proyecto"
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, projectId: e.target.value }))
                  }
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  loading={creating}
                >
                  {creating ? "Guardando…" : "Guardar pago"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!payments.length ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="Sin pagos registrados"
          description="Registra el primer pago de este cliente"
        />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Pendientes
              </h3>
              <div className="space-y-2">
                {pending.map((payment) => {
                  const overdue =
                    payment.dueDate &&
                    isPast(new Date(payment.dueDate)) &&
                    payment.status === "pending";
                  return (
                    <div
                      key={payment.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-4 transition-colors",
                        overdue
                          ? "border-danger/40 bg-[color-mix(in_oklab,var(--danger)_7%,transparent)]"
                          : "border-border bg-surface shadow-elev-1"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {payment.description}
                        </p>
                        {payment.dueDate && (
                          <p
                            className={cn(
                              "text-xs",
                              overdue ? "text-danger" : "text-text-muted"
                            )}
                          >
                            Vence:{" "}
                            {format(new Date(payment.dueDate), "dd/MM/yyyy")}
                            {overdue && " · VENCIDO"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-text">
                          {payment.currency}{" "}
                          {payment.amount.toLocaleString()}
                        </span>
                        <Select
                          aria-label={`Cambiar estado del pago ${payment.description}`}
                          value={payment.status}
                          onChange={(e) =>
                            handleStatusChange(
                              payment.id,
                              e.target.value as Payment["status"]
                            )
                          }
                          className="h-8 w-auto pr-8 text-xs"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="paid">Marcar pagado</option>
                          <option value="overdue">Vencido</option>
                          <option value="cancelled">Cancelar</option>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Historial ({done.length})
              </h3>
              <div className="space-y-2">
                {done.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {payment.description}
                      </p>
                      {payment.paidAt && (
                        <p className="text-xs text-text-tertiary">
                          Pagado:{" "}
                          {format(new Date(payment.paidAt), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-medium text-text">
                        {payment.currency}{" "}
                        {payment.amount.toLocaleString()}
                      </span>
                      <Badge variant={statusMeta[payment.status].variant}>
                        {statusMeta[payment.status].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
