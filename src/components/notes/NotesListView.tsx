"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { createNote, deleteNote } from "@/lib/actions/notes";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";

interface Note {
  id: string;
  title: string;
  contentText: string | null;
  updatedAt: string;
  creator?: { name: string | null; avatarUrl: string | null } | null;
}

interface NotesListViewProps {
  project: { id: string; name: string };
  notes: Note[];
}

export function NotesListView({
  project,
  notes: initialNotes,
}: NotesListViewProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const note = await createNote({
        projectId: project.id,
        title: "Nueva nota",
      });
      toast.success("Nota creada");
      router.push(`/projects/${project.id}/notes/${note.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      await deleteNote(noteId, project.id);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Nota eliminada");
    } catch (err) {
      toast.error((err as Error).message || "Error al eliminar");
    }
  }

  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText =
    parts.length > 1 ? parts.slice(1).join(" — ") : "notas.";

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()} / notas`}
        title={`${titleText},`}
        subtitle={subtitleText}
        issueLines={[`${notes.length} NOTAS`]}
        actions={
          <Button onClick={handleCreate} loading={creating} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Nueva nota
          </Button>
        }
      />

      <ProjectTabs projectId={project.id} />

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-12 w-12" />}
          title="Sin notas"
          description="Crea la primera nota de este proyecto"
          action={
            <Button onClick={handleCreate} loading={creating}>
              Crear nota
            </Button>
          }
        />
      ) : (
        <section>
          <HairlineRule label="Notas del proyecto" count={`${notes.length}`} />
          <ul className="h-list mt-3">
            {notes.map((note, i) => (
              <li key={note.id} className="h-list-item group">
                <span className="h-list-item-n">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`/projects/${project.id}/notes/${note.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                >
                  <span className="truncate text-[16px] font-bold text-ink">
                    {note.title}
                  </span>
                  {note.contentText && (
                    <span className="line-clamp-1 text-[14px] text-ink-soft">
                      {note.contentText}
                    </span>
                  )}
                </Link>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-faint">
                    {note.updatedAt &&
                      format(new Date(note.updatedAt), "dd MMM", {
                        locale: es,
                      })}
                  </span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    aria-label={`Eliminar nota ${note.title}`}
                    className="hidden rounded-md p-1 text-ink-faint transition-colors hover:bg-urgent-soft hover:text-urgent group-hover:block"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
