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
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <Link
        href="/operations/cotizador"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Cotizador
      </Link>
      <PageHeader title="Nueva cotización" />
      <div className="max-w-3xl">
        <QuoteForm />
      </div>
    </div>
  );
}
