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

  if (session?.user?.role !== "admin") {
    redirect(`/crm/${params.clientId}`);
  }

  const [client] = await db
    .select({ id: clients.id, companyName: clients.companyName })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!client) notFound();

  const accountRows = await db
    .select()
    .from(clientAccounts)
    .where(eq(clientAccounts.clientId, params.clientId))
    .orderBy(desc(clientAccounts.isPrimary));

  const accountsData = accountRows.map((a) => ({
    id: a.id,
    bankName: a.bankName ?? null,
    accountNumber: a.accountNumber,
    accountType: a.accountType ?? null,
    currency: a.currency ?? "USD",
    isPrimary: a.isPrimary ?? false,
  }));

  return (
    <AccountsView
      client={{ id: client.id, companyName: client.companyName }}
      accounts={accountsData}
    />
  );
}
