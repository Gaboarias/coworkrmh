"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Globe,
  Lock,
  FilePlus,
  Loader2,
} from "lucide-react";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import {
  createClientReport,
  publishReport,
  unpublishReport,
  deleteClientReport,
} from "@/lib/actions/clientReports";
import type { ClientReportRow } from "@/lib/actions/clientReports";
import { FilePreviewButton } from "./FilePreviewButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedClient {
  id: string;
  companyName: string;
}

interface ClientReportsViewProps {
  project: { id: string; name: string };
  reports: ClientReportRow[];
  linkedClients: LinkedClient[];
  canManage: boolean;
}

interface FormState {
  title: string;
  description: string;
  reportDate: string;
  clientId: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  reportDate: "",
  clientId: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientReportsView({
  project,
  reports: initialReports,
  linkedClients,
  canManage,
}: ClientReportsViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Optimistic list
  const [reports, setReports] = useState<ClientReportRow[]>(initialReports);
  const [isPending, startTransition] = useTransition();

  // ─── Form handlers ─────────────────────────────────────────────────────────

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPendingFile(file);
  }

  function removeFile() {
    setPendingFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("El título es requerido.");
      return;
    }

    let blobUrl: string | undefined;
    let mimeType: string | undefined;
    let sizeBytes: number | undefined;

    // 1. Upload file if present
    if (pendingFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append("file", pendingFile);
        fd.append("projectId", project.id);
        const up = await new Promise<{
          url: string;
          mimeType: string;
          sizeBytes: number;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/reports/upload");
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable)
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("Respuesta inválida del servidor"));
              }
            } else {
              let m = "Error al subir el archivo";
              try {
                m = (JSON.parse(xhr.responseText) as { error?: string }).error ?? m;
              } catch {
                /* no JSON */
              }
              reject(new Error(m));
            }
          };
          xhr.onerror = () => reject(new Error("Error de red"));
          xhr.send(fd);
        });
        blobUrl = up.url;
        mimeType = up.mimeType;
        sizeBytes = up.sizeBytes;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al subir el archivo."
        );
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    // 2. Create the report record
    startTransition(async () => {
      try {
        const newReport = await createClientReport({
          projectId: project.id,
          clientId: form.clientId || null,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          fileUrl: blobUrl,
          mimeType,
          sizeBytes,
          reportDate: form.reportDate || undefined,
        });

        setReports((prev) => [newReport, ...prev]);
        setForm(EMPTY_FORM);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Reporte creado.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al crear el reporte."
        );
      }
    });
  }

  // ─── Publish / Unpublish / Delete ──────────────────────────────────────────

  function handlePublish(reportId: string) {
    startTransition(async () => {
      try {
        await publishReport(reportId, project.id);
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, isPublished: true } : r))
        );
        toast.success("Reporte publicado.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error.");
      }
    });
  }

  function handleUnpublish(reportId: string) {
    startTransition(async () => {
      try {
        await unpublishReport(reportId, project.id);
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, isPublished: false } : r
          )
        );
        toast.success("Reporte despublicado.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error.");
      }
    });
  }

  function handleDelete(reportId: string) {
    if (!confirm("¿Eliminar este reporte? No se puede deshacer.")) return;
    startTransition(async () => {
      try {
        await deleteClientReport(reportId, project.id);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        toast.success("Reporte eliminado.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error.");
      }
    });
  }

  // ─── Page header parts ─────────────────────────────────────────────────────

  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText =
    parts.length > 1 ? parts.slice(1).join(" — ") : "reportes.";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()} / reportes`}
        title={`${titleText},`}
        subtitle={subtitleText}
      />
      <ProjectTabs projectId={project.id} />
      <HairlineRule />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        {/* ── Left: Form ── */}
        {canManage && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <FilePlus className="h-3.5 w-3.5" />
              Nuevo reporte
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Título <span className="text-[oklch(0.62_0.2_25)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ej. Reporte mensual mayo 2025"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-[var(--project-color,var(--ink))] focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Fecha del reporte
                </label>
                <input
                  type="date"
                  value={form.reportDate}
                  onChange={(e) => setField("reportDate", e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-[var(--project-color,var(--ink))] focus:outline-none"
                />
              </div>

              {/* Client */}
              {linkedClients.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted">
                    Cliente asociado
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setField("clientId", e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-[var(--project-color,var(--ink))] focus:outline-none"
                  >
                    <option value="">Sin cliente específico</option>
                    {linkedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Descripción (opcional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  placeholder="Breve descripción del contenido..."
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-[var(--project-color,var(--ink))] focus:outline-none"
                />
              </div>

              {/* File */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Archivo (opcional · máx. 500 MB)
                </label>

                {pendingFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-text">
                        {pendingFile.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatBytes(pendingFile.size)}
                      </p>
                      {isUploading && (
                        <div className="mt-1.5 h-1 w-full rounded-full bg-border">
                          <div
                            className="h-1 rounded-full bg-[var(--project-color,var(--ink))] transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={removeFile}
                        className="shrink-0 text-text-muted transition-colors hover:text-text"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-4 text-xs text-text-muted transition-colors hover:border-[var(--project-color,var(--ink))] hover:text-text"
                  >
                    <Upload className="h-4 w-4" />
                    Adjuntar archivo
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || isUploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--project-color,var(--ink))] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isUploading ? "Subiendo..." : "Creando..."}
                  </>
                ) : (
                  "Crear reporte"
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Right: Report list ── */}
        <div className={!canManage ? "lg:col-span-2" : ""}>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <FileText className="h-3.5 w-3.5" />
            Reportes{" "}
            <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs tabular-nums">
              {reports.length}
            </span>
          </h2>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-6 py-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-text-muted/40" />
              <p className="text-sm text-text-muted">
                No hay reportes todavía.
              </p>
              {canManage && (
                <p className="mt-1 text-xs text-text-muted/60">
                  Crea el primero con el formulario.
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  clients={linkedClients}
                  canManage={canManage}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ReportRow ────────────────────────────────────────────────────────────────

function ReportRow({
  report: r,
  clients,
  canManage,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  report: ClientReportRow;
  clients: LinkedClient[];
  canManage: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const clientName = clients.find((c) => c.id === r.clientId)?.companyName;

  return (
    <li className="group rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-[var(--project-color,var(--ink))/40]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">
              {r.title}
            </span>
            {r.isPublished ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.25_0.06_145)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.72_0.17_145)]">
                <Globe className="h-2.5 w-2.5" />
                Publicado
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted ring-1 ring-border">
                Borrador
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            {r.reportDate && <span>{formatDate(r.reportDate)}</span>}
            {clientName && (
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                {clientName}
              </span>
            )}
            {r.sizeBytes != null && r.sizeBytes > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                {formatBytes(r.sizeBytes)}
              </span>
            )}
          </div>

          {r.description && (
            <p className="mt-1.5 line-clamp-2 text-xs text-text-muted">
              {r.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {r.fileUrl && (
            <FilePreviewButton
              name={r.title}
              blobUrl={r.fileUrl}
              mimeType={r.mimeType}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-text"
            />
          )}
          {r.fileUrl && (
            <a
              href={r.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-text"
              title="Descargar"
              aria-label="Descargar reporte"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}

          {canManage && (
            <>
              {r.isPublished ? (
                <button
                  onClick={() => onUnpublish(r.id)}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-text"
                  title="Despublicar (ocultar del portal)"
                  aria-label="Despublicar reporte"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => onPublish(r.id)}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-[oklch(0.62_0.17_145)]"
                  title="Publicar en portal del cliente"
                  aria-label="Publicar reporte en el portal"
                >
                  <Globe className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                onClick={() => onDelete(r.id)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-background hover:text-[oklch(0.62_0.2_25)]"
                title="Eliminar reporte"
                aria-label="Eliminar reporte"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
