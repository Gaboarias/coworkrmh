import { db } from "@/lib/db";
import { notes, users } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { loadProject } from "@/lib/projects/access";
import { NotesListView } from "@/components/notes/NotesListView";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectNotesPage({ params }: PageProps) {
  const project = await loadProject(params.projectId);

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

  const notesData = noteRows.map((n) => ({
    id: n.id,
    title: n.title,
    contentText: n.contentText ?? null,
    updatedAt: n.updatedAt ? n.updatedAt.toISOString() : "",
    creator: {
      name: n.creatorName ?? null,
      avatarUrl: n.creatorAvatarUrl ?? null,
    },
  }));

  return <NotesListView project={project} notes={notesData} />;
}
