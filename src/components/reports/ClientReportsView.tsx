"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { IconButton, iconButtonVariants } from "@/components/ui/IconButton";
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
import { cn } from "@/lib/utils/cn";
import { formatDateCR } from "@/lib/utils/datetime";
import { formatBytes } from "@/lib/utils/format";

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
  // Usa el formateador CR centralizado (fija timeZone America/Costa_Rica).
  return iso ? formatDateCR(iso) : "—";
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
            <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              <FilePlus className="h-3.5 w-3.5" />
              Nuevo reporte
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-soft">
                  Título <span className="text-urgent">*</span>
                </label>
                <Input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ej. Reporte mensual mayo 2025"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-soft">
                  Fecha del reporte
                </label>
                <Input
                  type="date"
                  value={form.reportDate}
                  onChange={(e) => setField("reportDate", e.target.value)}
                />
              </div>

              {/* Client */}
              {linkedClients.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink-soft">
                    Cliente asociado
                  </label>
                  <Select
                    value={form.clientId}
                    onChange={(e) => setField("clientId", e.target.value)}
                  >
                    <option value="">Sin cliente específico</option>
                    {linkedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-soft">
                  Descripción (opcional)
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  placeholder="Breve descripción del contenido..."
                />
              </div>

              {/* File */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-soft">
                  Archivo (opcional · máx. 500 MB)
                </label>

                {pendingFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-rule bg-surface px-3 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-ink-soft" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        {pendingFile.name}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {formatBytes(pendingFile.size)}
                      </p>
                      {isUploading && (
                        <div className="mt-2 h-1 w-full rounded-full bg-border">
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
                        className="shrink-0 text-ink-soft transition-colors hover:text-ink"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-rule bg-surface px-3 py-4 text-xs text-ink-soft transition-colors hover:border-[var(--project-color,var(--ink))] hover:text-ink"
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

              {/* Pintaba `bg-[var(--project-color)] text-white` a mano: blanco
                  sobre un color que elige el usuario en un swatch. Con un
                  proyecto en amarillo o verde claro la etiqueta desaparecía, y
                  como el color lo había elegido esa persona, nadie lo reportaba
                  como bug. La variante `primary` está medida en los dos temas. */}
              <Button
                type="submit"
                size="lg"
                disabled={isPending || isUploading}
                className="w-full"
              >
                {isPending || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isUploading ? "Subiendo..." : "Creando..."}
                  </>
                ) : (
                  "Crear reporte"
                )}
              </Button>
            </form>
          </div>
        )}

        {/* ── Right: Report list ── */}
        <div className={!canManage ? "lg:col-span-2" : ""}>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <FileText className="h-3.5 w-3.5" />
            Reportes{" "}
            <span className="rounded-full bg-surface px-1.5 py-1 text-xs tabular-nums">
              {reports.length}
            </span>
          </h2>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-rule bg-surface px-6 py-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-ink-soft/40" />
              <p className="text-sm text-ink-soft">
                No hay reportes todavía.
              </p>
              {canManage && (
                <p className="mt-1 text-xs text-ink-soft/60">
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

  // Expand/colapsar la descripción. El botón "Ver más" solo aparece si el texto
  // realmente se trunca (medimos overflow mientras está clampeado, al montar).
  const descRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = descRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <li className="group rounded-xl border border-rule bg-surface px-4 py-4 transition-colors hover:border-[var(--project-color,var(--ink))/40]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">
              {r.title}
            </span>
            {r.isPublished ? (
              <Badge variant="success" className="shrink-0">
                <Globe className="h-2.5 w-2.5" />
                Publicado
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                Borrador
              </Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
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
            <>
              <p
                ref={descRef}
                className={cn(
                  "mt-2 text-xs text-ink-soft",
                  expanded ? "whitespace-pre-line" : "line-clamp-2"
                )}
              >
                {r.description}
              </p>
              {(clamped || expanded) && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="mt-1 text-xs font-medium text-[var(--project-color,var(--ink))] transition-colors hover:underline"
                >
                  {expanded ? "Ver menos" : "Ver más"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {r.fileUrl && (
            <FilePreviewButton
              name={r.title}
              blobUrl={r.fileUrl}
              mimeType={r.mimeType}
              className={iconButtonVariants()}
            />
          )}
          {r.fileUrl && (
            <a
              href={r.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={iconButtonVariants()}
              title="Descargar"
              aria-label="Descargar reporte"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}

          {canManage && (
            <>
              {r.isPublished ? (
                <IconButton
                  onClick={() => onUnpublish(r.id)}
                  title="Despublicar (ocultar del portal)"
                  label="Despublicar reporte"
                >
                  <Lock className="h-3.5 w-3.5" />
                </IconButton>
              ) : (
                <IconButton
                  onClick={() => onPublish(r.id)}
                  className="hover:bg-done-soft hover:text-done"
                  title="Publicar en portal del cliente"
                  label="Publicar reporte en el portal"
                >
                  <Globe className="h-3.5 w-3.5" />
                </IconButton>
              )}

              <IconButton
                tone="danger"
                onClick={() => onDelete(r.id)}
                title="Eliminar reporte"
                label="Eliminar reporte"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
