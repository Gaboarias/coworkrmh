import { notFound } from "next/navigation";
import { getPortalDataByToken } from "@/lib/actions/clients";
import { listPublishedReportsForClient } from "@/lib/actions/clientReports";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  CreditCard,
  Lock,
} from "lucide-react";

interface PageProps {
  params: { token: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: "Activo",      color: "#1f7a4d", bg: "rgba(31,122,77,0.1)" },
  in_progress: { label: "En progreso", color: "#2e52d9", bg: "rgba(46,82,217,0.1)" },
  completed:   { label: "Completado",  color: "#524d44", bg: "rgba(82,77,68,0.1)" },
  archived:    { label: "Archivado",   color: "#8a8378", bg: "rgba(138,131,120,0.1)" },
  planning:    { label: "Planeación",  color: "#e89a0d", bg: "rgba(232,154,13,0.1)" },
};

function ProjectBadge({ status }: { status: string }) {
  const s = PROJECT_STATUS[status] ?? { label: status, color: "#8a8378", bg: "rgba(138,131,120,0.1)" };
  return (
    <span
      style={{ color: s.color, background: s.bg }}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    >
      {s.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    paid:    { label: "Pagado",   icon: <CheckCircle2 className="h-3 w-3" />, color: "#1f7a4d", bg: "rgba(31,122,77,0.1)" },
    overdue: { label: "Vencido",  icon: <AlertCircle className="h-3 w-3" />,  color: "#e8281c", bg: "rgba(232,40,28,0.1)" },
    pending: { label: "Pendiente",icon: <Clock className="h-3 w-3" />,        color: "#e89a0d", bg: "rgba(232,154,13,0.1)" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{ color: s.color, background: s.bg }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    >
      {s.icon}
      {s.label}
    </span>
  );
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
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SectionLabel({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ color: "#8a8378" }}>{icon}</span>
        <h2 style={{ color: "#524d44" }} className="text-xs font-semibold uppercase tracking-widest">
          {title}
        </h2>
      </div>
      {count !== undefined && count > 0 && (
        <span style={{ color: "#8a8378", background: "#f1ede3" }} className="rounded-full px-2 py-0.5 text-xs tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalPage({ params }: PageProps) {
  const result = await getPortalDataByToken(params.token).catch(() => null);
  if (!result) notFound();

  const { client, projects, payments } = result;
  const reports = await listPublishedReportsForClient(client.id).catch(() => []);

  const pendingPayments = payments.filter((p) => p.status !== "paid");
  const paidPayments = payments.filter((p) => p.status === "paid");

  return (
    /* Force light theme — this page is always shown to external clients */
    <div style={{ background: "#f5f2eb", minHeight: "100dvh" }}>
      {/* ── Top bar ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid rgba(22,20,18,0.09)" }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {/* Pistachio wordmark */}
          <div className="flex items-center gap-2.5">
            <div
              style={{ background: "#161412", color: "#c9e58b" }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold select-none"
            >
              P
            </div>
            <span style={{ color: "#161412" }} className="text-sm font-semibold tracking-tight">
              Pistachio
            </span>
          </div>
          {/* Secure badge */}
          <div className="flex items-center gap-1.5" style={{ color: "#8a8378" }}>
            <Lock className="h-3 w-3" />
            <span className="text-xs">Enlace privado</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-2xl px-6 py-10 lg:py-14">

        {/* Client identity */}
        <div className="mb-10">
          <p style={{ color: "#8a8378" }} className="mb-1.5 text-xs font-medium uppercase tracking-widest">
            Portal de cliente
          </p>
          <h1 style={{ color: "#161412" }} className="text-3xl font-bold tracking-tight">
            {client.companyName}
          </h1>
          {client.contactName && (
            <p style={{ color: "#524d44" }} className="mt-1 text-sm">
              {client.contactName}
            </p>
          )}
        </div>

        <div className="space-y-8">

          {/* ── Proyectos ── */}
          <section>
            <SectionLabel
              icon={<FolderOpen className="h-3.5 w-3.5" />}
              title="Proyectos"
              count={projects.length}
            />
            {projects.length === 0 ? (
              <EmptyCard text="No hay proyectos vinculados todavía." />
            ) : (
              <div
                style={{ background: "#ffffff", border: "1px solid rgba(22,20,18,0.09)", borderRadius: "12px", overflow: "hidden" }}
              >
                {projects.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(22,20,18,0.07)" : "none",
                      padding: "14px 20px",
                    }}
                    className="flex items-center justify-between gap-3"
                  >
                    <span style={{ color: "#161412" }} className="text-sm font-medium">
                      {p.name}
                    </span>
                    <ProjectBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Reportes ── */}
          <section>
            <SectionLabel
              icon={<FileText className="h-3.5 w-3.5" />}
              title="Reportes"
              count={reports.length}
            />
            {reports.length === 0 ? (
              <EmptyCard text="No hay reportes publicados todavía." />
            ) : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    style={{ background: "#ffffff", border: "1px solid rgba(22,20,18,0.09)", borderRadius: "12px", padding: "16px 20px" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p style={{ color: "#161412" }} className="text-sm font-semibold leading-snug">
                          {r.title}
                        </p>
                        {r.description && (
                          <p style={{ color: "#524d44" }} className="mt-1 text-xs leading-relaxed line-clamp-2">
                            {r.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {r.reportDate && (
                            <span style={{ color: "#8a8378" }} className="text-xs">
                              {formatDate(r.reportDate)}
                            </span>
                          )}
                          {r.sizeBytes && r.sizeBytes > 0 && (
                            <span style={{ color: "#8a8378" }} className="text-xs">
                              {r.sizeBytes < 1024 * 1024
                                ? `${Math.round(r.sizeBytes / 1024)} KB`
                                : `${(r.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          )}
                        </div>
                      </div>
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#161412",
                            color: "#f5f2eb",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            textDecoration: "none",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Pagos ── */}
          {payments.length > 0 && (
            <section>
              <SectionLabel
                icon={<CreditCard className="h-3.5 w-3.5" />}
                title="Pagos"
                count={payments.length}
              />
              <div
                style={{ background: "#ffffff", border: "1px solid rgba(22,20,18,0.09)", borderRadius: "12px", overflow: "hidden" }}
              >
                {payments.map((pay, i) => (
                  <div
                    key={pay.id}
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(22,20,18,0.07)" : "none",
                      padding: "14px 20px",
                    }}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p style={{ color: "#161412" }} className="truncate text-sm font-medium">
                        {pay.description}
                      </p>
                      {pay.dueDate && pay.status !== "paid" && (
                        <p style={{ color: "#8a8378" }} className="text-xs">
                          Vence {formatDate(pay.dueDate)}
                        </p>
                      )}
                      {pay.paidAt && pay.status === "paid" && (
                        <p style={{ color: "#8a8378" }} className="text-xs">
                          Pagado {formatDate(pay.paidAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <PaymentStatusBadge status={pay.status} />
                      <span style={{ color: "#161412" }} className="text-sm font-bold tabular-nums">
                        {formatMoney(pay.amount, pay.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment summary if any pending */}
              {pendingPayments.length > 0 && (
                <div
                  style={{ background: "rgba(232,154,13,0.07)", border: "1px solid rgba(232,154,13,0.2)", borderRadius: "10px", padding: "12px 16px", marginTop: "8px" }}
                  className="flex items-center justify-between gap-2"
                >
                  <p style={{ color: "#7a5500" }} className="text-xs font-medium">
                    {pendingPayments.length === 1 ? "1 pago pendiente" : `${pendingPayments.length} pagos pendientes`}
                  </p>
                  <p style={{ color: "#7a5500" }} className="text-xs font-bold tabular-nums">
                    {formatMoney(
                      pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0).toFixed(2),
                      pendingPayments[0]?.currency || "CRC"
                    )}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{ borderTop: "1px solid rgba(22,20,18,0.09)", marginTop: "48px", paddingTop: "24px" }}
          className="flex items-center justify-between gap-4"
        >
          <p style={{ color: "#8a8378" }} className="text-xs">
            Pistachio · RMH Studio
          </p>
          <div className="flex items-center gap-1.5" style={{ color: "#8a8378" }}>
            <Lock className="h-3 w-3" />
            <span className="text-xs">Enlace personal, no compartir</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyCard({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px dashed rgba(22,20,18,0.15)",
        borderRadius: "12px",
        padding: "20px",
        color: "#8a8378",
        fontSize: "13px",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
