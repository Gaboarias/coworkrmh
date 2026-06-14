import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listSales } from "@/lib/actions/erpSales";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { SalesView } from "@/components/operations/SalesView";

export default async function VentasPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Ventas" />;
  const data = await listSales();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations / ventas"
        title="Ventas,"
        subtitle="registro y resumen."
        issueLines={[`${data.rows.length} REGISTROS`, ws.name.toUpperCase()]}
      />
      <SalesView data={data} canManage={can("sales.manage")} />
    </div>
  );
}
