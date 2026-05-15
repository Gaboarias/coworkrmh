"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, StickyNote, History, Settings, Filter } from "lucide-react";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
  bucket_id: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

type StatusFilter = "all" | "todo" | "in_progress" | "review" | "done";

interface ProjectTasksViewProps {
  project: Project;
  tasks: Task[];
  members: Profile[];
  canEdit: boolean;
}

export function ProjectTasksView({
  project,
  tasks: initialTasks,
  members,
  canEdit,
}: ProjectTasksViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas", icon: null, active: true },
    { href: `/projects/${project.id}/documents`, label: "Documentos", icon: FileText },
    { href: `/projects/${project.id}/notes`, label: "Notas", icon: StickyNote },
    { href: `/projects/${project.id}/changelog`, label: "Historial", icon: History },
    { href: `/projects/${project.id}/settings`, label: "Config.", icon: Settings },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          canEdit ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nueva tarea
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tareas..."
          className="w-48 rounded-lg border border-border bg-surface-el px-3 py-1.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none"
        />
        <div className="flex items-center gap-1">
          {(["all", "todo", "in_progress", "review", "done"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-surface-el text-text-muted hover:text-text"
              }`}
            >
              {s === "all" ? "Todas" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-text-tertiary">
          {filtered.length} tarea{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Sin tareas"
          description={
            search || statusFilter !== "all"
              ? "No hay tareas con esos filtros"
              : "Crea la primera tarea de este proyecto"
          }
          action={
            canEdit && !search && statusFilter === "all" ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Crear tarea
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectId={project.id}
              canEdit={canEdit}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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
