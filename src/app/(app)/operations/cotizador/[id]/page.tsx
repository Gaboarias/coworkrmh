import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { getQuote } from "@/lib/actions/erp";
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
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <Link
        href="/operations/cotizador"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Cotizador
      </Link>
      <PageHeader title={quote.title} />
      <div className="max-w-3xl">
        <QuoteForm quote={quote} canManage={can("quotes.manage")} />
      </div>
    </div>
  );
}
