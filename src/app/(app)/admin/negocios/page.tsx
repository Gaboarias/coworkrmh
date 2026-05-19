import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { BusinessesAdmin } from "@/components/admin/BusinessesAdmin";
import { listBusinessBuckets } from "@/lib/actions/teams";

export default async function AdminBusinessesPage() {
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    redirect("/dashboard");
  }

  const buckets = await listBusinessBuckets();

  return (
    <div className="animate-fade-in mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="Administración"
        description="Negocios / equipos"
      />
      <AdminNav />
      <BusinessesAdmin
        buckets={buckets.map((b) => ({
          id: b.id,
          name: b.name,
          color: b.color,
        }))}
      />
    </div>
  );
}
