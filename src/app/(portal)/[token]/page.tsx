import { notFound } from "next/navigation";
import { getPortalDataByToken } from "@/lib/actions/clients";
import { listPublishedReportsForClient } from "@/lib/actions/clientReports";
import {
  Building2,
  FolderOpen,
  FileText,
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface PageProps {
  params: { token: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Activo", className: "badge-active" },
    in_progress: { label: "En progreso", className: "badge-progress" },
    completed: { label: "Completado", className: "badge-done" },
    archived: { label: "Archivado", className: "badge-muted" },
    planning: { label: "Planeación", className: "badge-muted" },
  };
  const s = map[status] ?? { label: status, className: "badge-muted" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function paymentStatusIcon(status: string) {
  if (status === "paid") return <CheckCircle2 className="h-4 w-4 text-[oklch(0.62_0.17_145)]" />;
  if (status === "overdue") return <AlertCircle className="h-4 w-4 text-[oklch(0.62_0.2_25)]" />;
  return <Clock className="h-4 w-4 text-text-muted" />;
}

function formatMoney(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalPage({ params }: PageProps) {
  const [portalData] = await Promise.allSettled([
    getPortalDataByToken(params.token),
  ]);

  if (portalData.status === "rejected" || !portalData.value) {
    notFound();
  }

  const { client, projects, payments } = portalData.value;

  const reports = await listPublishedReportsForClient(client.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
      {/* ── Header ── */}
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-text-muted">
            Pistachio · RMH Studio
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {client.companyName}
          </h1>
          {client.contactName && (
            <p className="mt-0.5 text-sm text-text-muted">{client.contactName}</p>
          )}
        </div>
        {/* Logo mark */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.2_0.05_145)] text-[oklch(0.82_0.18_100)] font-bold text-lg select-none">
          P
        </div>
      </header>

      <div className="space-y-10">
        {/* ── Proyectos ── */}
        <section>
          <SectionHeader icon={<FolderOpen className="h-4 w-4" />} title="Proyectos" />
          {projects.length === 0 ? (
            <EmptyRow text="No hay proyectos vinculados." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 bg-surface px-5 py-3.5">
                  <span className="text-sm font-medium text-text">{p.name}</span>
                  {statusBadge(p.status)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Reportes publicados ── */}
        <section>
          <SectionHeader icon={<FileText className="h-4 w-4" />} title="Reportes" />
          {reports.length === 0 ? (
            <EmptyRow text="No hay reportes publicados todavía." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {reports.map((r) => (
                <li key={r.id} className="bg-surface px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{r.title}</p>
                      {r.description && (
                        <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      {r.reportDate && (
                        <p className="mt-1 text-xs text-text-muted">
                          {formatDate(r.reportDate)}
                        </p>
                      )}
                    </div>
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Pagos ── */}
        <section>
          <SectionHeader icon={<CreditCard className="h-4 w-4" />} title="Pagos" />
          {payments.length === 0 ? (
            <EmptyRow text="No hay facturas registradas." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {payments.map((pay) => (
                <li key={pay.id} className="flex items-center justify-between gap-4 bg-surface px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {paymentStatusIcon(pay.status)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {pay.description}
                      </p>
                      {pay.dueDate && (
                        <p className="text-xs text-text-muted">
                          Vence {formatDate(pay.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
                    {formatMoney(pay.amount, pay.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-14 border-t border-border pt-6 text-center text-xs text-text-muted">
        Portal de cliente · Pistachio RMH Studio<br />
        Este enlace es personal. No compartir.
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-text-muted">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h2>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-text-muted">
      {text}
    </div>
  );
}
