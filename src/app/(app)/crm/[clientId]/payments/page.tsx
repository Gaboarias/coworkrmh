import { db } from "@/lib/db";
import { clients, payments, projects } from "@/lib/db/schema";
import { eq, ne, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PaymentsView } from "@/components/crm/PaymentsView";

interface PageProps {
  params: { clientId: string };
}

export default async function ClientPaymentsPage({ params }: PageProps) {
  const [client] = await db
    .select({ id: clients.id, companyName: clients.companyName })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!client) notFound();

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, params.clientId))
    .orderBy(asc(payments.dueDate));

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(ne(projects.status, "archived"));

  const paymentsData = paymentRows.map((p) => ({
    id: p.id,
    description: p.description ?? "",
    amount: Number(p.amount),
    currency: p.currency ?? "USD",
    status: p.status as "pending" | "paid" | "overdue" | "cancelled",
    dueDate: p.dueDate ?? null,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    projectId: p.projectId ?? null,
  }));

  return (
    <PaymentsView
      client={{ id: client.id, companyName: client.companyName }}
      payments={paymentsData}
      projects={projectRows}
    />
  );
}
