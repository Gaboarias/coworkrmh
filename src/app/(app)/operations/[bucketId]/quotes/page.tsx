import Link from "next/link";
import { ChevronLeft, Plus, Calculator, Lock } from "lucide-react";
import { requireBucketAccess } from "@/lib/access";
import { listQuotes } from "@/lib/actions/quotes";
import { computeQuoteTotals } from "@/lib/actions/erp-shared";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";

const STATUS: Record<
  string,
  { label: string; variant: "neutral" | "info" | "success" | "danger" }
> = {
  draft: { label: "Borrador", variant: "neutral" },
  sent: { label: "Enviada", variant: "info" },
  accepted: { label: "Aceptada", variant: "success" },
  rejected: { label: "Rechazada", variant: "danger" },
};

export default async function QuotesPage({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  const { bucketName } = await requireBucketAccess(bucketId);
  const res = await listQuotes(bucketId);
  const allowed = res.success;
  const quotes = res.success ? res.data : [];

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
        title={`Cotizador · ${bucketName}`}
        description="Cotizaciones de pedidos personalizados"
        actions={
          allowed ? (
            <Link
              href={`/operations/${bucketId}/quotes/new`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color] duration-200 ease-out hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nueva cotización
            </Link>
          ) : null
        }
      />
      <Card>
        {!allowed ? (
          <EmptyState
            icon={<Lock className="h-10 w-10" />}
            title="Sin acceso"
            description={
              res.success ? "" : res.error
            }
          />
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={<Calculator className="h-10 w-10" />}
            title="Sin cotizaciones"
            description="Crea la primera cotización del negocio."
          />
        ) : (
          <div className="divide-y divide-border">
            {quotes.map((q) => {
              const t = computeQuoteTotals(q.items, q.ivaRate);
              const s = STATUS[q.status] ?? STATUS.draft;
              return (
                <Link
                  key={q.id}
                  href={`/operations/${bucketId}/quotes/${q.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-el"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {q.title}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {q.customerName ?? "Sin cliente"} · {q.items.length} ítem(s)
                    </p>
                  </div>
                  <span className="text-sm text-text">
                    ₡
                    {t.totalWithIva.toLocaleString("es-CR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
