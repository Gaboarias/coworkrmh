"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, List, LayoutGrid } from "lucide-react";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskBoard } from "@/components/tasks/TaskBoard";
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
  assignees?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  }[];
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
  const [view, setView] = useState<"lista" | "tablero">("lista");

  const matchesSearch = (t: Task) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase());

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return matchesSearch(t);
  });

  const active = filtered.filter((t) => t.status !== "done");
  const completed = filtered.filter((t) => t.status === "done");

  // El tablero muestra todas las tareas (los estados son las columnas), solo
  // filtradas por búsqueda — ignora el filtro de estado de la lista.
  const boardTasks = tasks.filter(matchesSearch);

  const newButton = canEdit ? (
    <button
      type="button"
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary-hover"
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

      {/* Switch de vista Lista | Tablero */}
      <div className="mb-4 flex items-center gap-1.5">
        {(
          [
            ["lista", "Lista", List],
            ["tablero", "Tablero", LayoutGrid],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              view === k
                ? "bg-accent-soft text-ink"
                : "text-ink-soft hover:bg-accent-soft hover:text-ink"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

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
        {view === "lista" && (
          <>
            <div className="flex items-center gap-1">
              {(
                ["all", "todo", "in_progress", "review", "done"] as StatusFilter[]
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors duration-150",
                    statusFilter === s
                      ? "bg-ink text-bg"
                      : "text-ink-soft hover:bg-accent-soft hover:text-ink"
                  )}
                >
                  {s === "all" ? "todas" : s.replace("_", " ")}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint">
              {filtered.length} de {tasks.length}
            </span>
          </>
        )}
      </div>

      {view === "tablero" ? (
        <TaskBoard
          tasks={boardTasks}
          projectId={project.id}
          canEdit={canEdit}
          onSelectTask={(id) => {
            const t = tasks.find((x) => x.id === id);
            if (t) setSelectedTask(t);
          }}
        />
      ) : filtered.length === 0 ? (
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
