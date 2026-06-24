"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  listSubtasks,
  createTask,
  listProjectTags,
  createTag,
  getTaskTagIds,
  setTaskTags,
} from "@/lib/actions/tasks";

interface Subtask {
  id: string;
  title: string;
  status: string;
}
interface ProjectTag {
  id: string;
  name: string;
  color: string;
}

export function TaskExtras({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [busyTags, setBusyTags] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [subs, allTags, taskTagIds] = await Promise.all([
        listSubtasks(taskId),
        listProjectTags(projectId),
        getTaskTagIds(taskId),
      ]);
      if (!alive) return;
      setSubtasks(subs.map((s) => ({ id: s.id, title: s.title, status: s.status })));
      setTags(allTags.map((t) => ({ id: t.id, name: t.name, color: t.color })));
      setSelected(taskTagIds);
    })();
    return () => {
      alive = false;
    };
  }, [taskId, projectId]);

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSub.trim()) return;
    setAddingSub(true);
    try {
      const t = await createTask({
        projectId,
        title: newSub.trim(),
        parentTaskId: taskId,
      });
      setSubtasks((s) => [...s, { id: t.id, title: t.title, status: t.status }]);
      setNewSub("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAddingSub(false);
    }
  }

  async function toggleTag(tagId: string) {
    const next = selected.includes(tagId)
      ? selected.filter((t) => t !== tagId)
      : [...selected, tagId];
    setSelected(next);
    try {
      await setTaskTags(taskId, projectId, next);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;
    setBusyTags(true);
    try {
      const tag = await createTag({ projectId, name: newTag.trim() });
      setTags((s) => [...s, { id: tag.id, name: tag.name, color: tag.color }]);
      setNewTag("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyTags(false);
    }
  }

  return (
    <>
      <div>
        <span className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          <TagIcon className="h-3 w-3" />
          Etiquetas
        </span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-text-tertiary">Sin etiquetas aún</span>
          )}
          {tags.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition",
                  on
                    ? "border-transparent text-white"
                    : "border-border text-text-muted hover:text-text"
                )}
                style={on ? { backgroundColor: t.color } : undefined}
              >
                {t.name}
              </button>
            );
          })}
        </div>
        <form onSubmit={handleCreateTag} className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Nueva etiqueta"
            className="h-8 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            loading={busyTags}
            aria-label="Agregar etiqueta"
            title="Agregar etiqueta"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Subtareas
        </span>
        <div className="space-y-1">
          {subtasks.length === 0 && (
            <p className="text-xs text-text-tertiary">Sin subtareas</p>
          )}
          {subtasks.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-md bg-surface-el px-2 py-1.5 text-sm"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  s.status === "done" ? "bg-success" : "bg-text-tertiary"
                )}
              />
              <span
                className={cn(
                  "flex-1 truncate",
                  s.status === "done"
                    ? "text-text-tertiary line-through"
                    : "text-text"
                )}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={addSubtask} className="mt-2 flex gap-2">
          <Input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Nueva subtarea"
            className="h-8 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            loading={addingSub}
            aria-label="Agregar subtarea"
            title="Agregar subtarea"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </>
  );
}
