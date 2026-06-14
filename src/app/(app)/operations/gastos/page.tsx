import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listExpenses } from "@/lib/actions/erpExpenses";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { ExpensesView } from "@/components/operations/ExpensesView";

export default async function GastosPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Gastos" />;
  const data = await listExpenses();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations / gastos"
        title="Gastos,"
        subtitle="inversión, fijos, equilibrio."
        issueLines={[
          `${data.investment.length + data.fixed.length} ÍTEMS`,
          ws.name.toUpperCase(),
        ]}
      />
      <ExpensesView data={data} canManage={can("expenses.manage")} />
    </div>
  );
}
