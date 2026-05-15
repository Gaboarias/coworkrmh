import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { Plus, Building2, Mail, Phone } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function CRMPage() {
  const clientRows = await db
    .select()
    .from(clients)
    .orderBy(asc(clients.companyName));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="CRM — Clientes"
        description="Gestión de clientes de Rewind Media House"
        actions={
          <Link
            href="/crm/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Link>
        }
      />

      {!clientRows.length ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Sin clientes"
          description="Agrega tu primer cliente al CRM"
          action={
            <Link
              href="/crm/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar cliente
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientRows.map((client) => (
            <Link
              key={client.id}
              href={`/crm/${client.id}`}
              className="group rounded-xl border border-border bg-surface p-5 transition hover:border-primary/50 hover:bg-surface-el"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-text group-hover:text-primary">
                    {client.companyName}
                  </h3>
                  {client.contactName && (
                    <p className="text-sm text-text-muted">{client.contactName}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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

              <div className="space-y-1">
                {client.email && (
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {client.phone}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
