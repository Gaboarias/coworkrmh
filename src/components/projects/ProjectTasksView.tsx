"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, StickyNote, History, Settings } from "lucide-react";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  const tabs = [
    { href: `/projects/${project.id}`, label: "Tareas", icon: null, active: true },
    { href: `/projects/${project.id}/documents`, label: "Documentos", icon: FileText },
    { href: `/projects/${project.id}/notes`, label: "Notas", icon: StickyNote },
    { href: `/projects/${project.id}/changelog`, label: "Historial", icon: History },
    { href: `/projects/${project.id}/settings`, label: "Config.", icon: Settings },
  ];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          canEdit ? (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
                "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-el text-text-muted hover:text-text"
              )}
            >
              {s === "all" ? "Todas" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-text-tertiary">
          {filtered.length} tarea{filtered.length !== 1 ? "s" : ""}
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
          action={
            canEdit && !search && statusFilter === "all" ? (
              <Button onClick={() => setShowCreateModal(true)}>
                Crear tarea
              </Button>
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
