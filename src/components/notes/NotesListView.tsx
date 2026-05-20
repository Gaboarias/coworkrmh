"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, StickyNote, Trash2, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createNote, deleteNote } from "@/lib/actions/notes";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

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

const tabs = (projectId: string) => [
  { href: `/projects/${projectId}`, label: "Tareas" },
  { href: `/projects/${projectId}/documents`, label: "Documentos" },
  { href: `/projects/${projectId}/notes`, label: "Notas", active: true },
  { href: `/projects/${projectId}/changelog`, label: "Historial" },
  { href: `/projects/${projectId}/settings`, label: "Config." },
];

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

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        {project.name}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">Notas</h1>
        <Button onClick={handleCreate} loading={creating}>
          <Plus className="h-4 w-4" />
          Nueva nota
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(project.id).map((tab) => (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-xl border border-border bg-surface p-4 shadow-elev-1 transition-colors hover:border-primary/50"
            >
              <Link
                href={`/projects/${project.id}/notes/${note.id}`}
                className="block"
              >
                <h3 className="mb-2 line-clamp-1 font-semibold text-text">
                  {note.title}
                </h3>
                {note.contentText && (
                  <p className="mb-3 line-clamp-3 text-xs text-text-muted">
                    {note.contentText}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  {note.creator && (
                    <UserAvatar
                      name={note.creator.name}
                      avatarUrl={note.creator.avatarUrl}
                      size="xs"
                    />
                  )}
                  <span className="text-xs text-text-tertiary">
                    {note.updatedAt &&
                      format(new Date(note.updatedAt), "dd/MM/yyyy")}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => handleDelete(note.id)}
                aria-label={`Eliminar nota ${note.title}`}
                className="absolute right-3 top-3 hidden rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-danger group-hover:block"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
