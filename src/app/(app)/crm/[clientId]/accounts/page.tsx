import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clients, clientAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { AccountsView } from "@/components/crm/AccountsView";

interface PageProps {
  params: { clientId: string };
}

export default async function ClientAccountsPage({ params }: PageProps) {
  const session = await auth();

  // Admin only
  if (session?.user?.role !== "admin") {
    redirect(`/crm/${params.clientId}`);
  }

  // Fetch client
  const [client] = await db
    .select({ id: clients.id, companyName: clients.companyName })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!client) notFound();

  // Fetch accounts ordered by isPrimary desc
  const accountRows = await db
    .select()
    .from(clientAccounts)
    .where(eq(clientAccounts.clientId, params.clientId))
    .orderBy(desc(clientAccounts.isPrimary));

  // Shape to match AccountsView interface (snake_case)
  const shapedClient = {
    id: client.id,
    company_name: client.companyName,
  };

  const shapedAccounts = accountRows.map((a) => ({
    id: a.id,
    bank_name: a.bankName ?? null,
    account_number: a.accountNumber,
    account_type: a.accountType ?? null,
    currency: a.currency ?? "USD",
    is_primary: a.isPrimary ?? false,
  }));

  return <AccountsView client={shapedClient} accounts={shapedAccounts} />;
}
