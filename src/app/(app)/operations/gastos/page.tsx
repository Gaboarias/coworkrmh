import { getActiveWorkspace } from "@/lib/workspace";
import { listExpenses } from "@/lib/actions/erp";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { ExpensesView } from "@/components/operations/ExpensesView";

export default async function GastosPage() {
  const ws = await getActiveWorkspace();
  if (!ws) return <NoEntorno title="Gastos" />;
  const data = await listExpenses();

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title="Gastos"
        description="Inversión inicial, gastos fijos y punto de equilibrio"
      />
      <ExpensesView data={data} />
    </div>
  );
}
