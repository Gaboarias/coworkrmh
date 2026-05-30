import Link from "next/link";
import { Plus, Calculator } from "lucide-react";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listQuotes } from "@/lib/actions/erp";
import { formatMoney } from "@/lib/utils/money";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { EmptyState } from "@/components/shared/EmptyState";

const STATUS: Record<
  string,
  { label: string; color: "ink" | "info" | "done" | "urgent" }
> = {
  draft: { label: "Borrador", color: "ink" },
  sent: { label: "Enviada", color: "info" },
  accepted: { label: "Aceptada", color: "done" },
  rejected: { label: "Rechazada", color: "urgent" },
};

export default async function CotizadorPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Cotizador" />;
  const canManage = can("quotes.manage");
  const quotes = await listQuotes();

  const newButton = canManage ? (
    <Link
      href="/operations/cotizador/nuevo"
      className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-bg transition-colors hover:bg-ink-soft"
    >
      <Plus className="h-3 w-3" />
      Nueva cotización
    </Link>
  ) : null;

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations / cotizador"
        title="Cotizador,"
        subtitle="pedidos personalizados."
        issueLines={[`${quotes.length} COTIZACIONES`, ws.name.toUpperCase()]}
        actions={newButton}
      />

      <HairlineRule label="Cotizaciones" count={`${quotes.length}`} />

      {quotes.length === 0 ? (
        <EmptyState
          icon={<Calculator className="h-10 w-10" />}
          title="Sin cotizaciones"
          description="Creá la primera cotización del entorno."
        />
      ) : (
        <ul className="h-list mt-3">
          {quotes.map((q, i) => {
            const net = q.items.reduce(
              (s, it) => s + it.qty * it.unitPrice,
              0
            );
            const total = net + net * q.ivaRate;
            const s = STATUS[q.status] ?? STATUS.draft;
            const statusColor =
              s.color === "done"
                ? "var(--done)"
                : s.color === "urgent"
                  ? "var(--urgent)"
                  : s.color === "info"
                    ? "var(--info)"
                    : "var(--ink-soft)";
            return (
              <li key={q.id} className="h-list-item">
                <span className="h-list-item-n">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`/operations/cotizador/${q.id}`}
                  className="flex min-w-0 flex-1 items-baseline gap-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-ink">
                      {q.title}
                    </span>
                    <span className="block truncate text-[12px] text-ink-soft">
                      {q.customerName ?? "Sin cliente"} · {q.items.length}{" "}
                      ítem(s)
                    </span>
                  </span>
                </Link>
                <div className="flex flex-shrink-0 items-baseline gap-4">
                  <span className="text-[14px] font-bold tabular-nums text-ink">
                    {formatMoney(total)}
                  </span>
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.16em]"
                    style={{ color: statusColor }}
                  >
                    {s.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
