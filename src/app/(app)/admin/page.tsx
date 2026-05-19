import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import {
  listUsersWithAssignments,
  listBucketsWithProfiles,
} from "@/lib/actions/profiles";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    redirect("/dashboard");
  }

  const [users, buckets] = await Promise.all([
    listUsersWithAssignments(),
    listBucketsWithProfiles(),
  ]);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="Administración"
        description="Usuarios, roles globales y asignaciones por negocio"
      />
      <AdminNav />
      <UsersAdmin
        users={users}
        buckets={buckets}
        currentUserId={session.user.id}
      />
    </div>
  );
}
