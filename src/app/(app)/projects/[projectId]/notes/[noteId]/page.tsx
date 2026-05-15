import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, notes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NoteEditorView } from "@/components/notes/NoteEditorView";

interface PageProps {
  params: { projectId: string; noteId: string };
}

export default async function NoteEditorPage({ params }: PageProps) {
  const session = await auth();

  // Fetch note and verify it belongs to this project
  const [note] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.id, params.noteId),
        eq(notes.projectId, params.projectId)
      )
    )
    .limit(1);

  if (!note) notFound();

  // Fetch project
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Shape note to match NoteEditorView interface (snake_case)
  const shapedNote = {
    id: note.id,
    title: note.title,
    content: note.content,
    project_id: note.projectId,
  };

  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <NoteEditorView
      note={shapedNote}
      project={project}
      userId={session?.user?.id ?? ""}
      userName={userName}
    />
  );
}
