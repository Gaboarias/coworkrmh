"use client";

import { File, Download, Trash2, Image, FileText, Film } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { deleteDocument } from "@/lib/actions/documents";

interface Document {
  id: string;
  name: string;
  storage_path: string; // now holds the Vercel Blob public URL
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: string;
}

interface DocumentListProps {
  documents: Document[];
  projectId: string;
  canDelete?: boolean;
  userId?: string;
  onDeleted: () => void;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-info" />;
  if (mimeType.startsWith("video/")) return <Film className="h-5 w-5 text-warning" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-danger" />;
  return <File className="h-5 w-5 text-text-tertiary" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  projectId,
  canDelete = false,
  userId,
  onDeleted,
}: DocumentListProps) {
  async function handleDelete(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    try {
      await deleteDocument(doc.id, doc.storage_path, projectId);
      toast.success("Documento eliminado");
      onDeleted();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  if (!documents.length) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        No hay documentos adjuntos
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition hover:border-border-strong"
        >
          <FileIcon mimeType={doc.mime_type} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{doc.name}</p>
            <p className="text-xs text-text-tertiary">
              {formatBytes(doc.size_bytes)} ·{" "}
              {format(new Date(doc.created_at), "dd/MM/yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <a
              href={doc.storage_path}
              download={doc.name}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-el hover:text-text"
              title="Descargar"
            >
              <Download className="h-4 w-4" />
            </a>

            {(canDelete || doc.uploaded_by === userId) && (
              <button
                onClick={() => handleDelete(doc)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-el hover:text-danger"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
