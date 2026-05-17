"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/tasks";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface CreateTaskModalProps {
  projectId: string;
  members: Profile[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTaskModal({
  projectId,
  members,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      await createTask({
        projectId,
        title: title.trim(),
        description: description || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });
      toast.success("Tarea creada");
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md animate-slide-up rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Nueva tarea</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary transition hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Fecha límite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Asignar a
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition hover:bg-surface-el"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
