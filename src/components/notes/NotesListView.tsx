"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createNote, deleteNote } from "@/lib/actions/notes";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface Note {
  id: string;
  title: string;
  content_text: string | null;
  created_at: string;
  updated_at: string;
  creator?: { full_name: string | null; avatar_url: string | null } | null;
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

export function NotesListView({ project, notes: initialNotes }: NotesListViewProps) {
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
    } catch {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← {project.name}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">Notas</h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Nueva nota
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(project.id).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
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
            <button
              onClick={handleCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Crear nota
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-xl border border-border bg-surface p-4 transition hover:border-primary/50"
            >
              <Link
                href={`/projects/${project.id}/notes/${note.id}`}
                className="block"
              >
                <h3 className="mb-2 font-semibold text-text line-clamp-1">
                  {note.title}
                </h3>
                {note.content_text && (
                  <p className="mb-3 text-xs text-text-muted line-clamp-3">
                    {note.content_text}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {note.creator && (
                      <UserAvatar
                        name={note.creator.full_name}
                        avatarUrl={note.creator.avatar_url}
                        size="xs"
                      />
                    )}
                    <span className="text-xs text-text-tertiary">
                      {format(new Date(note.updated_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => handleDelete(note.id)}
                className="absolute right-3 top-3 hidden text-text-tertiary hover:text-danger group-hover:block"
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
