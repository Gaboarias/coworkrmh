"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, FileQuestion } from "lucide-react";

interface PreviewDoc {
  name: string;
  blobUrl: string;
  mimeType: string;
}

type Kind = "image" | "video" | "audio" | "pdf" | "office" | "text" | "none";

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

function previewKind(mime: string): Kind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (OFFICE_MIMES.has(mime)) return "office";
  if (
    mime.startsWith("text/") ||
    mime === "application/json"
  )
    return "text";
  return "none";
}

/**
 * Preview de archivos sin descargar. Renderiza según el MIME:
 *  - image/video/audio/pdf → inline nativo.
 *  - Office (docx/xlsx/pptx) → visor público de Office (requiere URL pública;
 *    los blobs de Vercel lo son). Sin cuenta ni SDK.
 *  - text/csv/json → iframe (el navegador los muestra como texto).
 *  - resto → fallback con botón de descarga.
 */
export function FilePreviewModal({
  doc,
  onClose,
}: {
  doc: PreviewDoc | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!doc) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [doc, onClose]);

  if (!doc || typeof document === "undefined") return null;

  const kind = previewKind(doc.mimeType);
  const officeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    doc.blobUrl
  )}`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa: ${doc.name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-rule-strong bg-surface-el shadow-elev-3"
      >
        <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <p className="min-w-0 truncate text-[14px] font-bold text-ink">
            {doc.name}
          </p>
          <div className="flex flex-shrink-0 items-center gap-1">
            <a
              href={doc.blobUrl}
              download={doc.name}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-accent-soft hover:text-ink"
              title="Descargar"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-accent-soft hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-bg">
          {kind === "image" && (
            <div className="flex h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.blobUrl}
                alt={doc.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {kind === "video" && (
            <div className="flex h-full items-center justify-center bg-black p-2">
              <video
                src={doc.blobUrl}
                controls
                className="max-h-full max-w-full"
              />
            </div>
          )}

          {kind === "audio" && (
            <div className="flex h-full items-center justify-center p-8">
              <audio src={doc.blobUrl} controls className="w-full max-w-lg" />
            </div>
          )}

          {kind === "pdf" && (
            <iframe src={doc.blobUrl} title={doc.name} className="h-full w-full" />
          )}

          {kind === "office" && (
            <iframe src={officeSrc} title={doc.name} className="h-full w-full" />
          )}

          {kind === "text" && (
            <iframe
              src={doc.blobUrl}
              title={doc.name}
              className="h-full w-full bg-white"
            />
          )}

          {kind === "none" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <FileQuestion className="h-10 w-10 text-ink-faint" />
              <p className="text-sm text-ink-soft">
                No se puede previsualizar este tipo de archivo.
              </p>
              <a
                href={doc.blobUrl}
                download={doc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
