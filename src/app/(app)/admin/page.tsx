import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { listAllUsers, listWorkspacesAdmin } from "@/lib/actions/workspaces";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user.role as string) !== "admin") redirect("/dashboard");

  const [users, workspaces] = await Promise.all([
    listAllUsers(),
    listWorkspacesAdmin(),
  ]);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="Administración"
        description="Usuarios y entornos. Cada entorno aísla sus proyectos y operaciones."
      />
      <AdminPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? "",
          avatarUrl: u.avatarUrl ?? null,
          role: u.role,
        }))}
        workspaces={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          memberCount: w.memberCount,
        }))}
      />
    </div>
  );
}
