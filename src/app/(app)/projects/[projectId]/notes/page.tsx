import { db } from "@/lib/db";
import { projects, notes, users } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NotesListView } from "@/components/notes/NotesListView";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectNotesPage({ params }: PageProps) {
  // Fetch project
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch notes with creator info
  const noteRows = await db
    .select({
      id: notes.id,
      title: notes.title,
      contentText: notes.contentText,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      creatorName: users.name,
      creatorAvatarUrl: users.avatarUrl,
    })
    .from(notes)
    .leftJoin(users, eq(notes.createdBy, users.id))
    .where(
      eq(notes.projectId, params.projectId)
    )
    .orderBy(desc(notes.updatedAt));

  // Shape to match NotesListView interface (snake_case)
  const shapedNotes = noteRows.map((n) => ({
    id: n.id,
    title: n.title,
    content_text: n.contentText ?? null,
    created_at: n.createdAt ? String(n.createdAt) : "",
    updated_at: n.updatedAt ? String(n.updatedAt) : "",
    creator: {
      full_name: n.creatorName ?? null,
      avatar_url: n.creatorAvatarUrl ?? null,
    },
  }));

  return (
    <NotesListView project={project} notes={shapedNotes} />
  );
}
