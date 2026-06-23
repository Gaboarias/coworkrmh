"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/tasks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AssigneePicker } from "@/components/tasks/AssigneePicker";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
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
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Hay datos sin guardar → el Modal pide confirmación antes de descartar
  // por click afuera / Escape / X (evita perder la tarea por accidente).
  const dirty =
    title.trim() !== "" ||
    description.trim() !== "" ||
    assigneeIds.length > 0 ||
    dueDate !== "" ||
    priority !== "medium";

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
        assigneeIds,
        dueDate: dueDate || undefined,
      });
      toast.success("Tarea creada");
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      confirmDismiss={dirty}
      title="Nueva tarea"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            loading={loading}
            disabled={!title.trim()}
          >
            {loading ? "Creando…" : "Crear tarea"}
          </Button>
        </>
      }
    >
      <form
        id="create-task-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label htmlFor="task-title" className="sr-only">
            Título de la tarea
          </label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="task-desc" className="sr-only">
            Descripción
          </label>
          <Textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-priority"
              className="mb-1 block text-xs font-medium text-text-muted"
            >
              Prioridad
            </label>
            <Select
              id="task-priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as typeof priority)
              }
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="task-due"
              className="mb-1 block text-xs font-medium text-text-muted"
            >
              Fecha límite
            </label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Asignar a {assigneeIds.length > 0 && `(${assigneeIds.length})`}
          </label>
          <AssigneePicker
            members={members}
            value={assigneeIds}
            onChange={setAssigneeIds}
          />
        </div>
      </form>
    </Modal>
  );
}
