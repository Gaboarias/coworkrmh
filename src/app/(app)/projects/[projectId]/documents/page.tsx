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

  // Proyecto y documentos son independientes — paralelizar.
  const [[project], documentRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(eq(documents.projectId, params.projectId))
      .orderBy(desc(documents.createdAt)),
  ]);

  if (!project) notFound();

  const documentsData = documentRows.map((d) => ({
    id: d.id,
    name: d.name,
    blobUrl: d.blobUrl ?? "",
    mimeType: d.mimeType ?? "",
    sizeBytes: d.sizeBytes ?? 0,
    createdAt: d.createdAt ? d.createdAt.toISOString() : "",
    uploadedBy: d.uploadedBy ?? "",
  }));

  const role = (session?.user?.role as string) ?? "";
  const canDelete = role === "admin" || role === "manager";

  return (
    <DocumentsView
      project={project}
      documents={documentsData}
      userId={session?.user?.id ?? ""}
      canDelete={canDelete}
    />
  );
}
