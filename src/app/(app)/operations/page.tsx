import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ShieldQuestion } from "lucide-react";
import { getAccessibleBuckets } from "@/lib/access";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { BucketSelector } from "@/components/operations/shared/BucketSelector";

export default async function OperationsPage() {
  const { userId, isAdmin, buckets } = await getAccessibleBuckets();
  if (!userId) redirect("/login");

  if (buckets.length === 1) {
    redirect(`/operations/${buckets[0].id}`);
  }

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <PageHeader
        title="Operaciones"
        description="Catálogo de productos y costos por negocio"
      />

      {buckets.length === 0 ? (
        <EmptyState
          icon={<ShieldQuestion className="h-10 w-10" />}
          title="Sin negocios asignados"
          description="No tienes acceso a ningún equipo todavía. Pide a un administrador que te asigne."
          action={
            isAdmin ? (
              <Link
                href="/admin/negocios"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color] duration-200 ease-out hover:bg-primary-hover"
              >
                <Package className="h-4 w-4" />
                Gestionar negocios
              </Link>
            ) : undefined
          }
        />
      ) : (
        <BucketSelector buckets={buckets} />
      )}
    </div>
  );
}
