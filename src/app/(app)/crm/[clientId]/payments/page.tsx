import { db } from "@/lib/db";
import { clients, payments, projects } from "@/lib/db/schema";
import { eq, ne, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PaymentsView } from "@/components/crm/PaymentsView";

interface PageProps {
  params: { clientId: string };
}

export default async function ClientPaymentsPage({ params }: PageProps) {
  // Fetch client
  const [client] = await db
    .select({ id: clients.id, companyName: clients.companyName })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!client) notFound();

  // Fetch payments ordered by due date
  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, params.clientId))
    .orderBy(asc(payments.dueDate));

  // Fetch active projects
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(ne(projects.status, "archived"));

  // Shape client to match PaymentsView interface
  const shapedClient = {
    id: client.id,
    company_name: client.companyName,
  };

  // Shape payments to match PaymentsView interface (snake_case, amount as number)
  const shapedPayments = paymentRows.map((p) => ({
    id: p.id,
    description: p.description ?? "",
    amount: Number(p.amount),
    currency: p.currency ?? "USD",
    status: p.status as "pending" | "paid" | "overdue" | "cancelled",
    due_date: p.dueDate ?? null,
    paid_at: p.paidAt ?? null,
    project_id: p.projectId ?? null,
  }));

  return (
    <PaymentsView
      client={shapedClient}
      payments={shapedPayments}
      projects={projectRows}
    />
  );
}
