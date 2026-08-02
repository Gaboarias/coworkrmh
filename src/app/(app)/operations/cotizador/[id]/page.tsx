import { notFound } from "next/navigation";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { getQuote } from "@/lib/actions/erpQuotes";
import { isUuid } from "@/lib/utils/uuid";
import { BackLink } from "@/components/shared/BackLink";
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

  // erp_quotes.id es uuid: sin este guard, un id como "999" hacía fallar la
  // query dentro de getQuote y terminaba en pantalla de error.
  if (!isUuid(params.id)) notFound();

  let quote;
  try {
    quote = await getQuote(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <BackLink href="/operations/cotizador">Cotizador</BackLink>
      <PageHeader
        eyebrow="/ operaciones / cotizador"
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
