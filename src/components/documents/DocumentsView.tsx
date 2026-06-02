"use client";

import { useRouter } from "next/navigation";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { DocumentList } from "./DocumentList";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";

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
  documents,
  userId,
  canDelete,
}: DocumentsViewProps) {
  const router = useRouter();
  // Antes había `useState(initialDocs)` acá: el upload llamaba a
  // router.refresh() pero el state local quedaba congelado en initialDocs.
  // Resultado: la lista no se actualizaba hasta navegar. Solución: leer
  // `documents` directo de props — Next refetcha el server component al
  // refresh y las nuevas props se reflejan automáticamente.

  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText =
    parts.length > 1 ? parts.slice(1).join(" — ") : "documentos.";

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()} / documentos`}
        title={`${titleText},`}
        subtitle={subtitleText}
        issueLines={[`${documents.length} ARCHIVOS`]}
      />

      <ProjectTabs projectId={project.id} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <HairlineRule label="Subir archivos" />
          <div className="mt-4">
            <FileUploadDropzone
              projectId={project.id}
              onUploaded={() => router.refresh()}
            />
          </div>
        </div>

        <div>
          <HairlineRule label="Archivos" count={`${documents.length}`} />
          <div className="mt-4">
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
    </div>
  );
}
