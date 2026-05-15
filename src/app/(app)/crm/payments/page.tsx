import { db } from "@/lib/db";
import { payments, clients } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { AlertTriangle } from "lucide-react";

export default async function AllPaymentsPage() {
  const paymentRows = await db
    .select({ payment: payments, client: clients })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .where(inArray(payments.status, ["pending", "overdue"]))
    .orderBy(asc(payments.dueDate));

  // Shape to flat structure for rendering
  const items = paymentRows.map(({ payment, client }) => ({
    id: payment.id,
    description: payment.description ?? "",
    amount: Number(payment.amount),
    currency: payment.currency ?? "USD",
    status: payment.status,
    due_date: payment.dueDate ?? null,
    clientId: client?.id ?? null,
    companyName: client?.companyName ?? null,
  }));

  const overdue = items.filter(
    (p) => p.status === "overdue" || (p.due_date && isPast(new Date(p.due_date)))
  );
  const upcoming = items.filter(
    (p) => p.status === "pending" && p.due_date && !isPast(new Date(p.due_date))
  );
  const noDueDate = items.filter((p) => !p.due_date);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="CRM — Pagos"
        description="Pagos pendientes y próximos vencimientos"
      />

      {/* Summary */}
      {overdue.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <AlertTriangle className="h-5 w-5 text-danger" />
          <p className="text-sm font-medium text-danger">
            {overdue.length} pago{overdue.length > 1 ? "s" : ""} vencido{overdue.length > 1 ? "s" : ""} ·{" "}
            USD {overdue.reduce((s, p) => s + p.amount, 0).toLocaleString()}
          </p>
        </div>
      )}

      {!items.length ? (
        <p className="py-16 text-center text-sm text-text-muted">
          Sin pagos pendientes
        </p>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-danger">
                Vencidos ({overdue.length})
              </h3>
              <div className="space-y-2">
                {overdue.map((p) => (
                  <Link
                    key={p.id}
                    href={`/crm/${p.clientId}/payments`}
                    className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger/5 p-4 transition hover:border-danger/50"
                  >
                    <div>
                      <p className="font-medium text-text">{p.description}</p>
                      <p className="text-sm text-text-muted">
                        {p.companyName}
                        {p.due_date && ` · Venció ${format(new Date(p.due_date), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <p className="font-semibold text-danger">
                      {p.currency} {p.amount.toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-text-muted">
                Próximos ({upcoming.length})
              </h3>
              <div className="space-y-2">
                {upcoming.map((p) => (
                  <Link
                    key={p.id}
                    href={`/crm/${p.clientId}/payments`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:border-border-strong"
                  >
                    <div>
                      <p className="font-medium text-text">{p.description}</p>
                      <p className="text-sm text-text-muted">
                        {p.companyName}
                        {p.due_date && ` · ${format(new Date(p.due_date), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <p className="font-semibold text-text">
                      {p.currency} {p.amount.toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {noDueDate.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-text-muted">
                Sin fecha ({noDueDate.length})
              </h3>
              <div className="space-y-2">
                {noDueDate.map((p) => (
                  <Link
                    key={p.id}
                    href={`/crm/${p.clientId}/payments`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:border-border-strong"
                  >
                    <div>
                      <p className="font-medium text-text">{p.description}</p>
                      <p className="text-sm text-text-muted">{p.companyName}</p>
                    </div>
                    <p className="font-semibold text-text">
                      {p.currency} {p.amount.toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
