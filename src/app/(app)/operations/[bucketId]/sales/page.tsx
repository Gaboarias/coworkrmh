import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import { listSales } from "@/lib/actions/sales";
import {
  listProductCategories,
  getBucketName,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { SalesView } from "@/components/operations/sales/SalesView";
import { EmptyState } from "@/components/shared/EmptyState";
import { Lock } from "lucide-react";

export default async function SalesPage({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");
  const [res, catRes, bucketName] = await Promise.all([
    listSales(bucketId),
    listProductCategories(bucketId),
    getBucketName(bucketId),
  ]);
  const categories = catRes.success
    ? catRes.data.map((c) => ({ id: c.id, name: c.name }))
    : [];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/operations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Operaciones
      </Link>
      <OperationsTabs bucketId={bucketId} />
      <PageHeader
        title={`Ventas · ${bucketName ?? ""}`}
        description="Registro de ventas del negocio"
      />
      {res.success ? (
        <SalesView
          bucketId={bucketId}
          data={res.data}
          categories={categories}
        />
      ) : (
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Sin acceso"
          description={res.error}
        />
      )}
    </div>
  );
}
