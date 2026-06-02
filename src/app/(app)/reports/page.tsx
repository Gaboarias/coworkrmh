import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";
import { getWorkspaceReport } from "@/lib/actions/reports";
import { ReportsView } from "@/components/reports/ReportsView";
import { formatDateCR } from "@/lib/utils/datetime";

/**
 * /reports (Edition 04).
 *
 * Drop-line title: "Mayo," / "en números."
 * Eyebrow "/ reports".
 * Issue numeration con el mes y el workspace.
 */
export default async function ReportsPage() {
  const report = await getWorkspaceReport();

  if (!report) {
    return (
      <div className="animate-fade-in px-8 py-10 md:px-12">
        <PageHeader eyebrow="/ reports" title="Reportes." />
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="Sin entorno activo"
          description="Seleccioná un entorno para ver sus reportes."
        />
      </div>
    );
  }

  // En CR para no mostrar el mes siguiente desde las 6pm CR del último día.
  const now = new Date();
  const monthName = formatDateCR(now, { month: "long" });
  const monthShort = formatDateCR(now, { month: "2-digit", year: "numeric" });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ reports"
        title={`${monthCap},`}
        subtitle="en números."
        issueLines={[
          `Ed. 04 · ${monthShort}`,
          `${report.workspaceName.toUpperCase()}`,
        ]}
      />
      <ReportsView report={report} />
    </div>
  );
}
