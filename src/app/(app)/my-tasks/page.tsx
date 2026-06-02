import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckSquare, Layers } from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatDateCR, isPastDateCR } from "@/lib/utils/datetime";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="animate-fade-in px-8 py-10 md:px-12">
        <PageHeader eyebrow="/ mis tareas" title="Mis tareas." />
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Sin entorno"
          description="No perteneces a ningún entorno todavía. Pedile a un administrador que te asigne uno."
        />
      </div>
    );
  }

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
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        eq(projects.workspaceId, ws.id)
      )
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.createdBy));

  const pending = taskRows.filter((t) => t.status !== "done");
  const done = taskRows.filter((t) => t.status === "done");

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ mis tareas"
        title="Mis tareas,"
        subtitle={`${pending.length} pendiente${pending.length !== 1 ? "s" : ""}.`}
        issueLines={[
          `${taskRows.length} TOTAL`,
          `${done.length} COMPLETADAS`,
        ]}
      />

      {!taskRows.length ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="Sin tareas asignadas"
          description="Las tareas que te asignen aparecerán aquí"
        />
      ) : (
        <div className="space-y-10">
          {pending.length > 0 && (
            <section>
              <HairlineRule label="Pendientes" count={`${pending.length}`} />
              <ul className="h-list mt-3">
                {pending.map((task, i) => {
                  const isOverdue = isPastDateCR(task.dueDate);
                  const due = task.dueDate ? formatDateCR(task.dueDate) : null;
                  const isUrgent = task.priority === "urgent";
                  return (
                    <li key={task.id} className="h-list-item">
                      <span className="h-list-item-n">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="flex min-w-0 flex-1 items-baseline gap-3"
                      >
                        <span
                          className={
                            "min-w-0 flex-1 truncate text-[16px] leading-snug " +
                            (isUrgent
                              ? "font-bold text-ink"
                              : "font-medium text-ink")
                          }
                        >
                          {task.title}
                        </span>
                        <span className="flex flex-shrink-0 items-baseline gap-2">
                          <span
                            className="h-2 w-2 self-center rounded-full"
                            style={{
                              backgroundColor:
                                task.projectColor ?? "var(--ink-faint)",
                            }}
                          />
                          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-faint">
                            {task.projectName}
                          </span>
                        </span>
                      </Link>
                      {isUrgent || isOverdue ? (
                        <span className="pill pill-urgent">
                          {due ?? "Urgente"}
                        </span>
                      ) : due ? (
                        <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-faint">
                          {due}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <HairlineRule label="Completadas" count={`${done.length}`} />
              <ul className="h-list mt-3 opacity-60">
                {done.slice(0, 10).map((task, i) => (
                  <li key={task.id} className="h-list-item">
                    <span className="h-list-item-n">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="flex min-w-0 flex-1 items-baseline gap-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink-soft line-through">
                        {task.title}
                      </span>
                      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-faint">
                        {task.projectName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
