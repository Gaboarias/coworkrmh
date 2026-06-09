import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients, clientProjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { listClientReports } from "@/lib/actions/clientReports";
import { ClientReportsView } from "@/components/reports/ClientReportsView";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectReportsPage({ params }: PageProps) {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const canManage = role === "admin" || role === "manager";

  // Proyecto + clientes vinculados en paralelo.
  const [[project], reportRows, clientRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1),
    listClientReports(params.projectId),
    db
      .select({ id: clients.id, companyName: clients.companyName })
      .from(clientProjects)
      .innerJoin(clients, eq(clients.id, clientProjects.clientId))
      .where(eq(clientProjects.projectId, params.projectId)),
  ]);

  if (!project) notFound();

  return (
    <ClientReportsView
      project={project}
      reports={reportRows}
      linkedClients={clientRows}
      canManage={canManage}
    />
  );
}
