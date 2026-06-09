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

  // Nota y proyecto son independientes — paralelizar.
  const [[note], [project]] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, params.noteId),
          eq(notes.projectId, params.projectId)
        )
      )
      .limit(1),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1),
  ]);

  if (!note) notFound();
  if (!project) notFound();

  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <NoteEditorView
      note={{ id: note.id, title: note.title, content: note.content }}
      project={project}
      userId={session?.user?.id ?? ""}
      userName={userName}
    />
  );
}
