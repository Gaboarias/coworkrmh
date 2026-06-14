import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { getQuote } from "@/lib/actions/erpQuotes";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { QuoteForm } from "@/components/operations/QuoteForm";

export default async function EditarCotizacionPage({
  params,
}: {
  params: { id: string };
}) {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Cotización" />;

  let quote;
  try {
    quote = await getQuote(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <Link
        href="/operations/cotizador"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-3 w-3" />
        Cotizador
      </Link>
      <PageHeader
        eyebrow="/ operations / cotizador"
        title={`${quote.title},`}
        subtitle={quote.customerName ?? "cotización."}
        issueLines={[`${quote.items.length} ÍTEMS`, quote.status.toUpperCase()]}
      />
      <div className="max-w-3xl">
        <QuoteForm quote={quote} canManage={can("quotes.manage")} />
      </div>
    </div>
  );
}
