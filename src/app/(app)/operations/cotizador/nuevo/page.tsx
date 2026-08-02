import { redirect } from "next/navigation";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { BackLink } from "@/components/shared/BackLink";
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
      <BackLink href="/operations/cotizador">Cotizador</BackLink>
      <PageHeader
        eyebrow="/ operaciones / cotizador / nueva"
        title="Nueva cotización,"
        subtitle="pedido personalizado."
      />
      <div className="max-w-3xl">
        <QuoteForm />
      </div>
    </div>
  );
}
