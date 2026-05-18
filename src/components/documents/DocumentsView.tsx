"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { DocumentList } from "./DocumentList";
import { cn } from "@/lib/utils/cn";

interface Document {
  id: string;
  name: string;
  blobUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: string;
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
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        {project.name}
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text">
        Documentos
      </h1>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
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
