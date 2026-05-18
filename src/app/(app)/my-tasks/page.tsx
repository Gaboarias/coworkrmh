import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import Link from "next/link";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckSquare } from "lucide-react";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.assigneeId, userId))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdBy));

  const pending = taskRows.filter((t) => t.status !== "done");
  const done = taskRows.filter((t) => t.status === "done");

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <PageHeader
        title="Mis tareas"
        description={`${pending.length} tarea${pending.length !== 1 ? "s" : ""} pendiente${pending.length !== 1 ? "s" : ""}`}
      />

      {!taskRows.length ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="Sin tareas asignadas"
          description="Las tareas que te asignen aparecerán aquí"
        />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-text-muted">
                Pendientes
              </h3>
              <div className="space-y-1">
                {pending.map((task) => {
                  const isOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date();

                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-surface-el"
                    >
                      <TaskStatusBadge status={task.status} />
                      <span className="flex-1 truncate text-sm text-text">
                        {task.title}
                      </span>
                      <TaskPriorityBadge priority={task.priority} />
                      {task.projectName && (
                        <span className="flex items-center gap-1.5 text-xs text-text-muted">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: task.projectColor ?? "var(--accent)" }}
                          />
                          {task.projectName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          className={`text-xs ${isOverdue ? "font-semibold text-danger" : "text-text-tertiary"}`}
                        >
                          {format(new Date(task.dueDate), "dd/MM")}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-text-muted">
                Completadas ({done.length})
              </h3>
              <div className="space-y-1 opacity-60">
                {done.slice(0, 10).map((task) => (
                  <Link
                    key={task.id}
                    href={`/projects/${task.projectId}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-surface-el"
                  >
                    <TaskStatusBadge status={task.status} />
                    <span className="flex-1 truncate text-sm text-text-tertiary line-through">
                      {task.title}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
