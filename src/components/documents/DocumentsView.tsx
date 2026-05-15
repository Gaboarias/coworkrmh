"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  StickyNote,
  History,
  Settings,
  Paperclip,
} from "lucide-react";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { DocumentList } from "./DocumentList";

interface Document {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: string;
}

interface DocumentsViewProps {
  project: { id: string; name: string };
  documents: Document[];
  userId: string;
  canDelete: boolean;
}

export function DocumentsView({
  project,
  documents: initialDocs,
  userId,
  canDelete,
}: DocumentsViewProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocs);

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas" },
    { href: `/projects/${project.id}/documents`, label: "Documentos", active: true },
    { href: `/projects/${project.id}/notes`, label: "Notas" },
    { href: `/projects/${project.id}/changelog`, label: "Historial" },
    { href: `/projects/${project.id}/settings`, label: "Config." },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-text">Documentos</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-muted">
            Subir archivos
          </h3>
          <FileUploadDropzone
            projectId={project.id}
            onUploaded={() => router.refresh()}
          />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-muted">
            Archivos ({documents.length})
          </h3>
          <DocumentList
            documents={documents}
            projectId={project.id}
            canDelete={canDelete}
            userId={userId}
            onDeleted={() => router.refresh()}
          />
        </div>
      </div>
    </div>
  );
}
