import { getActiveWorkspace } from "@/lib/workspace";
import { listSales } from "@/lib/actions/erp";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { SalesView } from "@/components/operations/SalesView";

export default async function VentasPage() {
  const ws = await getActiveWorkspace();
  if (!ws) return <NoEntorno title="Ventas" />;
  const data = await listSales();

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title={`Ventas · ${ws.name}`}
        description="Registro de ventas y resumen por categoría"
      />
      <SalesView data={data} />
    </div>
  );
}
