import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { QuoteForm } from "@/components/operations/QuoteForm";

export default async function NuevaCotizacionPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Nueva cotización" />;
  if (!can("quotes.manage")) redirect("/operations/cotizador");
  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <Link
        href="/operations/cotizador"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-3 w-3" />
        Cotizador
      </Link>
      <PageHeader
        eyebrow="/ operations / cotizador / nueva"
        title="Nueva cotización,"
        subtitle="pedido personalizado."
      />
      <div className="max-w-3xl">
        <QuoteForm />
      </div>
    </div>
  );
}
