"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/Input";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { cn } from "@/lib/utils/cn";
import type { TaskStatus, TaskPriority } from "@/lib/types";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  projectId: string;
  createdBy: string;
  createdAt: string | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

type StatusFilter = "all" | "todo" | "in_progress" | "review" | "done";

interface ProjectTasksViewProps {
  project: Project;
  tasks: Task[];
  members: Profile[];
  canEdit: boolean;
}

/**
 * ProjectTasksView (Edition 04).
 *
 * - PageHeader drop-line "Aliaga," / "Spot TV"
 * - ProjectTabs (Tareas/Docs/Notas/Historial/Config) — active underline
 *   en project-color (heredado del layout)
 * - HairlineRule "Activas" + "Completadas" separadas
 * - Search + status filter como mono pills
 */
export function ProjectTasksView({
  project,
  tasks,
  members,
  canEdit,
}: ProjectTasksViewProps) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const active = filtered.filter((t) => t.status !== "done");
  const completed = filtered.filter((t) => t.status === "done");

  const newButton = canEdit ? (
    <button
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-bg transition-colors hover:bg-ink-soft"
    >
      <Plus className="h-3 w-3" />
      Nueva tarea
    </button>
  ) : null;

  // Split nombre del proyecto en title + subtitle si tiene " — " o " - "
  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText = parts.length > 1 ? parts.slice(1).join(" — ") : undefined;

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()}`}
        title={`${titleText},`}
        subtitle={subtitleText ?? project.description ?? "proyecto."}
        issueLines={[
          `${tasks.length} TAREAS`,
          `${active.length} ACTIVAS · ${completed.length} COMPLETADAS`,
        ]}
        actions={newButton}
      />

      <ProjectTabs projectId={project.id} />

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tareas…"
          aria-label="Buscar tareas"
          className="w-52"
        />
        <div className="flex items-center gap-1">
          {(
            ["all", "todo", "in_progress", "review", "done"] as StatusFilter[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-150",
                statusFilter === s
                  ? "bg-ink text-bg"
                  : "text-ink-soft hover:bg-accent-soft hover:text-ink"
              )}
            >
              {s === "all" ? "todas" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {filtered.length} de {tasks.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin tareas"
          description={
            search || statusFilter !== "all"
              ? "No hay tareas con esos filtros"
              : "Crea la primera tarea de este proyecto"
          }
          action={canEdit && !search && statusFilter === "all" ? newButton : undefined}
        />
      ) : (
        <div className="space-y-10">
          {active.length > 0 && (
            <section>
              <HairlineRule
                label="Activas"
                count={`${active.length}`}
                labelColor="var(--project-color)"
              />
              <div className="mt-3 space-y-1">
                {active.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectId={project.id}
                    canEdit={canEdit}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <HairlineRule
                label="Completadas"
                count={`${completed.length}`}
              />
              <div className="mt-3 space-y-1 opacity-70">
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectId={project.id}
                    canEdit={canEdit}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          projectId={project.id}
          members={members}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          projectId={project.id}
          members={members}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
