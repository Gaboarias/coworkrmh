import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DocumentsView } from "@/components/documents/DocumentsView";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectDocumentsPage({ params }: PageProps) {
  const session = await auth();

  // Fetch project
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch documents
  const documentRows = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, params.projectId))
    .orderBy(desc(documents.createdAt));

  // Shape to match DocumentsView interface (snake_case)
  const shapedDocuments = documentRows.map((d) => ({
    id: d.id,
    name: d.name,
    storage_path: d.blobUrl ?? "",
    mime_type: d.mimeType ?? "",
    size_bytes: d.sizeBytes ?? 0,
    created_at: d.createdAt ? String(d.createdAt) : "",
    uploaded_by: d.uploadedBy ?? "",
  }));

  const role = (session?.user?.role as string) ?? "";
  const canDelete = role === "admin" || role === "manager";

  return (
    <DocumentsView
      project={project}
      documents={shapedDocuments}
      userId={session?.user?.id ?? ""}
      canDelete={canDelete}
    />
  );
}
