import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";
import { getWorkspaceReport } from "@/lib/actions/reports";
import { ReportsView } from "@/components/reports/ReportsView";

/**
 * /reports — Sunset Aurora · N5
 * Vista de KPIs + charts agregadas del workspace activo.
 * Sin sub-rutas (overview en una sola página por ahora).
 */
export default async function ReportsPage() {
  const report = await getWorkspaceReport();

  if (!report) {
    return (
      <div className="animate-fade-in p-6 md:p-8">
        <PageHeader title="Reportes" />
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="Sin entorno activo"
          description="Seleccioná un entorno para ver sus reportes."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <PageHeader
        title="Reportes"
        description={`Resumen de los últimos 30 días — ${report.workspaceName}`}
      />
      <ReportsView report={report} />
    </div>
  );
}
