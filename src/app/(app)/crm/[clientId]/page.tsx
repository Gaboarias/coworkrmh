import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, payments } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, MapPin, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface PageProps {
  params: { clientId: string };
}

export default async function ClientProfilePage({ params }: PageProps) {
  const session = await auth();
  const isAdmin = (session?.user?.role as string) === "admin";

  // Fetch client
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!client) notFound();

  // Fetch recent payments
  const recentPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, params.clientId))
    .orderBy(asc(payments.dueDate))
    .limit(5);

  const tabs = [
    { href: `/crm/${client.id}`, label: "Perfil", active: true },
    { href: `/crm/${client.id}/payments`, label: "Pagos" },
    ...(isAdmin ? [{ href: `/crm/${client.id}/accounts`, label: "Cuentas" }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <Link href="/crm" className="text-sm text-text-muted hover:text-text">
          ← Clientes
        </Link>
      </div>

      <PageHeader
        title={client.companyName}
        description={client.contactName ?? undefined}
        actions={
          <Link
            href={`/crm/${client.id}/payments`}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <CreditCard className="h-4 w-4" />
            Ver pagos
          </Link>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-text">
            Información de contacto
          </h3>
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-text-tertiary" />
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm text-text hover:text-primary"
                >
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-text-tertiary" />
                <a
                  href={`tel:${client.phone}`}
                  className="text-sm text-text hover:text-primary"
                >
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <p className="text-sm text-text">{client.address}</p>
              </div>
            )}
            <div className="pt-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  client.status === "active"
                    ? "bg-success/10 text-success"
                    : client.status === "prospect"
                      ? "bg-warning/10 text-warning"
                      : "bg-text-tertiary/10 text-text-tertiary"
                }`}
              >
                {client.status === "active"
                  ? "Activo"
                  : client.status === "prospect"
                    ? "Prospecto"
                    : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-text">
            Notas internas
          </h3>
          {client.notes ? (
            <p className="whitespace-pre-wrap text-sm text-text-muted">
              {client.notes}
            </p>
          ) : (
            <p className="text-sm text-text-tertiary">Sin notas</p>
          )}
        </div>

        {/* Recent payments */}
        <div className="col-span-1 rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Pagos recientes</h3>
            <Link
              href={`/crm/${client.id}/payments`}
              className="text-xs text-primary hover:text-primary-hover"
            >
              Ver todos
            </Link>
          </div>
          {!recentPayments.length ? (
            <p className="text-sm text-text-tertiary">Sin pagos</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg p-2 hover:bg-surface-el"
                >
                  <p className="truncate text-sm text-text">{p.description}</p>
                  <div className="ml-2 text-right">
                    <p className="text-sm font-medium text-text">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </p>
                    <span
                      className={`text-xs ${
                        p.status === "paid"
                          ? "text-success"
                          : p.status === "overdue"
                            ? "text-danger"
                            : "text-warning"
                      }`}
                    >
                      {p.status === "paid"
                        ? "Pagado"
                        : p.status === "overdue"
                          ? "Vencido"
                          : "Pendiente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
