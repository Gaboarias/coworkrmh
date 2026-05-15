"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CreditCard } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { createPayment, updatePaymentStatus } from "@/lib/actions/clients";
import { EmptyState } from "@/components/shared/EmptyState";

interface Payment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
  paid_at: string | null;
  project_id: string | null;
}

interface PaymentsViewProps {
  client: { id: string; company_name: string };
  payments: Payment[];
  projects: { id: string; name: string }[];
}

const statusConfig = {
  pending: { label: "Pendiente", class: "text-warning bg-warning/10" },
  paid: { label: "Pagado", class: "text-success bg-success/10" },
  overdue: { label: "Vencido", class: "text-danger bg-danger/10" },
  cancelled: { label: "Cancelado", class: "text-text-tertiary bg-surface-el" },
};

const tabs = (clientId: string) => [
  { href: `/crm/${clientId}`, label: "Perfil" },
  { href: `/crm/${clientId}/payments`, label: "Pagos", active: true },
  { href: `/crm/${clientId}/accounts`, label: "Cuentas" },
];

export function PaymentsView({ client, payments: initialPayments, projects }: PaymentsViewProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    currency: "USD",
    due_date: "",
    project_id: "",
  });

  const pending = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const done = payments.filter((p) => p.status === "paid" || p.status === "cancelled");
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createPayment({
        client_id: client.id,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        due_date: form.due_date || undefined,
        project_id: form.project_id || undefined,
      });
      toast.success("Pago registrado");
      setShowForm(false);
      setForm({ description: "", amount: "", currency: "USD", due_date: "", project_id: "" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(paymentId: string, status: Payment["status"]) {
    try {
      await updatePaymentStatus(paymentId, client.id, status);
      router.refresh();
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none";

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <Link href="/crm" className="text-sm text-text-muted hover:text-text">
          ← Clientes
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{client.company_name}</h1>
          <p className="text-sm text-text-muted">Pagos y facturación</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo pago
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(client.id).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Summary */}
      {pending.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">
            {pending.length} pago{pending.length > 1 ? "s" : ""} pendiente{pending.length > 1 ? "s" : ""} ·{" "}
            USD {totalPending.toLocaleString()}
          </p>
        </div>
      )}

      {/* New payment form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-semibold text-text">Registrar pago</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descripción del pago"
              required
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Monto"
                required
                min="0"
                step="0.01"
                className={inputClass}
              />
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className={inputClass}
              />
              <select
                value={form.project_id}
                onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Sin proyecto</option>
                {projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-el"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {creating ? "Guardando..." : "Guardar pago"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments list */}
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
              <h3 className="mb-3 text-sm font-semibold text-text-muted">Pendientes</h3>
              <div className="space-y-2">
                {pending.map((payment) => {
                  const overdue =
                    payment.due_date &&
                    isPast(new Date(payment.due_date)) &&
                    payment.status === "pending";
                  return (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        overdue ? "border-danger/40 bg-danger/5" : "border-border bg-surface"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-text">{payment.description}</p>
                        {payment.due_date && (
                          <p className={`text-xs ${overdue ? "text-danger" : "text-text-muted"}`}>
                            Vence: {format(new Date(payment.due_date), "dd/MM/yyyy")}
                            {overdue && " · VENCIDO"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-text">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </span>
                        <select
                          value={payment.status}
                          onChange={(e) =>
                            handleStatusChange(payment.id, e.target.value as Payment["status"])
                          }
                          className="rounded-lg border border-border bg-surface-el px-2 py-1 text-xs text-text focus:outline-none"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="paid">Marcar pagado</option>
                          <option value="overdue">Vencido</option>
                          <option value="cancelled">Cancelar</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-text-muted">
                Historial ({done.length})
              </h3>
              <div className="space-y-2 opacity-70">
                {done.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
                  >
                    <div>
                      <p className="text-sm text-text">{payment.description}</p>
                      {payment.paid_at && (
                        <p className="text-xs text-text-tertiary">
                          Pagado: {format(new Date(payment.paid_at), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text">
                        {payment.currency} {payment.amount.toLocaleString()}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[payment.status].class}`}
                      >
                        {statusConfig[payment.status].label}
                      </span>
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
