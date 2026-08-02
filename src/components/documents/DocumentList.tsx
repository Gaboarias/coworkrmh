"use client";

import { useState } from "react";
// `Image` va aliasado: es el ícono de lucide, no next/image. Sin el alias,
// jsx-a11y/alt-text lo confunde con un <img> y pide una prop `alt`.
import {
  File,
  Download,
  Trash2,
  Image as ImageIcon,
  FileText,
  Film,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDocument } from "@/lib/actions/documents";
import { formatDateCR } from "@/lib/utils/datetime";
import { formatBytes } from "@/lib/utils/format";
import { IconButton, iconButtonVariants } from "@/components/ui/IconButton";
import { FilePreviewModal } from "./FilePreviewModal";

interface Document {
  id: string;
  name: string;
  blobUrl: string; // Vercel Blob public URL
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: string;
}

interface DocumentListProps {
  documents: Document[];
  projectId: string;
  canDelete?: boolean;
  userId?: string;
  onDeleted: () => void;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-info" />;
  if (mimeType.startsWith("video/")) return <Film className="h-5 w-5 text-warn" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-urgent" />;
  return <File className="h-5 w-5 text-ink-faint" />;
}

export function DocumentList({
  documents,
  projectId,
  canDelete = false,
  userId,
  onDeleted,
}: DocumentListProps) {
  const [preview, setPreview] = useState<Document | null>(null);

  async function handleDelete(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    try {
      await deleteDocument(doc.id, doc.blobUrl, projectId);
      toast.success("Documento eliminado");
      onDeleted();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  if (!documents.length) {
    return (
      <p className="py-8 text-center text-sm text-ink-soft">
        No hay documentos adjuntos
      </p>
    );
  }

  return (
    <>
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group flex items-center gap-3 rounded-lg border border-rule bg-surface p-3 transition hover:border-rule-strong"
        >
          <button
            type="button"
            onClick={() => setPreview(doc)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            title="Vista previa"
          >
            <FileIcon mimeType={doc.mimeType} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {doc.name}
              </p>
              <p className="text-xs text-ink-faint">
                {formatBytes(doc.sizeBytes)}
                {doc.createdAt && ` · ${formatDateCR(doc.createdAt)}`}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <IconButton
              onClick={() => setPreview(doc)}
              label={`Vista previa de ${doc.name}`}
              title="Vista previa"
            >
              <Eye className="h-4 w-4" />
            </IconButton>

            <a
              href={doc.blobUrl}
              download={doc.name}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Descargar ${doc.name}`}
              className={iconButtonVariants()}
              title="Descargar"
            >
              <Download className="h-4 w-4" />
            </a>

            {(canDelete || doc.uploadedBy === userId) && (
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                aria-label={`Eliminar ${doc.name}`}
                className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-surface-el hover:text-urgent"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
    <FilePreviewModal doc={preview} onClose={() => setPreview(null)} />
    </>
  );
}
