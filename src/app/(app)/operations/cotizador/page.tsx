import Link from "next/link";
import { Plus, Calculator } from "lucide-react";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listQuotes } from "@/lib/actions/erp";
import { formatMoney } from "@/lib/utils/money";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
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

export default async function CotizadorPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Cotizador" />;
  const canManage = can("quotes.manage");
  const quotes = await listQuotes();

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title="Cotizador"
        description="Cotizaciones de pedidos personalizados"
        actions={
          canManage ? (
            <Link
              href="/operations/cotizador/nuevo"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color] duration-200 ease-out hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nueva cotización
            </Link>
          ) : null
        }
      />
      <Card>
        {quotes.length === 0 ? (
          <EmptyState
            icon={<Calculator className="h-10 w-10" />}
            title="Sin cotizaciones"
            description="Creá la primera cotización del entorno."
          />
        ) : (
          <div className="divide-y divide-border">
            {quotes.map((q) => {
              const net = q.items.reduce(
                (s, i) => s + i.qty * i.unitPrice,
                0
              );
              const total = net + net * q.ivaRate;
              const s = STATUS[q.status] ?? STATUS.draft;
              return (
                <Link
                  key={q.id}
                  href={`/operations/cotizador/${q.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-el"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {q.title}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {q.customerName ?? "Sin cliente"} · {q.items.length}{" "}
                      ítem(s)
                    </p>
                  </div>
                  <span className="text-sm text-text">
                    {formatMoney(total)}
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
