import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listClients } from "@/lib/actions/clients";
import { ClientsView } from "@/components/clients/ClientsView";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user.role as string) ?? "";
  if (role !== "admin" && role !== "manager") {
    redirect("/dashboard");
  }

  const clients = await listClients();

  return <ClientsView clients={clients} isAdmin={role === "admin"} />;
}
