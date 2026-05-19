import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/shared/PageHeader";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { QuoteForm } from "@/components/operations/QuoteForm";

export default async function NuevaCotizacionPage() {
  const ws = await getActiveWorkspace();
  if (!ws) return <NoEntorno title="Nueva cotización" />;
  return (
    <div className="animate-fade-in mx-auto max-w-3xl p-6 md:p-8">
      <Link
        href="/operations/cotizador"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Cotizador
      </Link>
      <PageHeader title="Nueva cotización" />
      <QuoteForm />
    </div>
  );
}
