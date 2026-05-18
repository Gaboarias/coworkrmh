import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import { listExpenses } from "@/lib/actions/expenses";
import { getBucketName } from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { ExpensesView } from "@/components/operations/expenses/ExpensesView";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function ExpensesPage({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");
  const [res, bucketName] = await Promise.all([
    listExpenses(bucketId),
    getBucketName(bucketId),
  ]);

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
        title={`Gastos · ${bucketName ?? ""}`}
        description="Inversión inicial, gastos fijos y punto de equilibrio"
      />
      {res.success ? (
        <ExpensesView bucketId={bucketId} data={res.data} />
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
