import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminPanel } from "@/components/admin/AdminPanel";
import {
  listAllUsers,
  listWorkspacesAdmin,
  listAllUserWorkspaceIds,
} from "@/lib/actions/workspaces";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user.role as string) !== "admin") redirect("/dashboard");

  const [users, workspaces, userWorkspaceIds] = await Promise.all([
    listAllUsers(),
    listWorkspacesAdmin(),
    listAllUserWorkspaceIds(),
  ]);

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-8 py-10 md:px-12">
      <PageHeader
        eyebrow="/ admin"
        title="Administración,"
        subtitle="usuarios y entornos."
        issueLines={[
          `${users.length} USUARIOS`,
          `${workspaces.length} ENTORNOS`,
        ]}
      />
      <AdminPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? "",
          avatarUrl: u.avatarUrl ?? null,
          role: u.role,
          workspaceCount: u.workspaceCount,
        }))}
        workspaces={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          memberCount: w.memberCount,
        }))}
        userWorkspaceIds={userWorkspaceIds}
      />
    </div>
  );
}
