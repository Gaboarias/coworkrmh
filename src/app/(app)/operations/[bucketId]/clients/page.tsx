import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { canAccessBucket, bucketCan } from "@/lib/access";
import {
  listClientsForBucket,
  listPaymentsForBucket,
} from "@/lib/actions/clients";
import { getBucketName } from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { ClientsView } from "@/components/operations/clients/ClientsView";
import { PaymentsPanel } from "@/components/operations/clients/PaymentsPanel";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function OperationsClientsPage({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

  const allowed = await bucketCan(bucketId, "clients.view");
  const bucketName = await getBucketName(bucketId);

  let clients: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  }[] = [];
  let payments: {
    id: string;
    clientId: string;
    companyName: string;
    description: string;
    amount: string;
    currency: string;
    status: "pending" | "paid" | "overdue" | "cancelled";
    dueDate: string | null;
  }[] = [];

  if (allowed) {
    const [cRows, pRows] = await Promise.all([
      listClientsForBucket(bucketId),
      listPaymentsForBucket(bucketId),
    ]);
    clients = cRows.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
    }));
    payments = pRows.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      companyName: p.companyName ?? "",
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      dueDate: (p.dueDate as string | null) ?? null,
    }));
  }

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/operations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Operaciones
      </Link>
      <OperationsTabs bucketId={bucketId} />
      <PageHeader
        title={`Clientes · ${bucketName ?? ""}`}
        description="Clientes y cobros del negocio"
      />
      {allowed ? (
        <div className="space-y-8">
          <ClientsView bucketId={bucketId} clients={clients} />
          <PaymentsPanel
            clients={clients.map((c) => ({
              id: c.id,
              companyName: c.companyName,
            }))}
            payments={payments}
          />
        </div>
      ) : (
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Sin acceso"
          description="Tu perfil no tiene permiso para ver clientes en este negocio."
        />
      )}
    </div>
  );
}
