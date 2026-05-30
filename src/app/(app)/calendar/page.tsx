import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, projects, notes, changelog } from "@/lib/db/schema";
import { eq, isNotNull, asc, and } from "drizzle-orm";
import { CalendarView } from "@/components/calendar/CalendarView";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Layers } from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) {
    return (
      <div className="animate-fade-in px-8 py-10 md:px-12">
        <PageHeader eyebrow="/ calendario" title="Calendario." />
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
      assigneeId: tasks.assigneeId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(isNotNull(tasks.dueDate), eq(projects.workspaceId, ws.id)))
    .orderBy(asc(tasks.dueDate));

  const tasksData = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate as string,
    projectId: t.projectId ?? "",
    assigneeId: t.assigneeId ?? null,
    project: t.projectName
      ? { name: t.projectName, color: t.projectColor ?? null }
      : null,
  }));

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      startDate: projects.startDate,
      endDate: projects.endDate,
    })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        isNotNull(projects.startDate),
        isNotNull(projects.endDate)
      )
    );

  const projectsData = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color ?? null,
    startDate: p.startDate as string,
    endDate: p.endDate as string,
  }));

  const noteRows = await db
    .select({
      id: notes.id,
      title: notes.title,
      projectId: notes.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      createdAt: notes.createdAt,
    })
    .from(notes)
    .innerJoin(projects, eq(notes.projectId, projects.id))
    .where(eq(projects.workspaceId, ws.id))
    .orderBy(asc(notes.createdAt));

  const notesData = noteRows.map((n) => ({
    id: n.id,
    title: n.title,
    projectId: n.projectId,
    projectName: n.projectName ?? null,
    projectColor: n.projectColor ?? null,
    date: (n.createdAt as Date).toISOString(),
  }));

  const changelogRows = await db
    .select({
      id: changelog.id,
      description: changelog.description,
      projectId: changelog.projectId,
      projectName: projects.name,
      createdAt: changelog.createdAt,
    })
    .from(changelog)
    .innerJoin(projects, eq(changelog.projectId, projects.id))
    .where(
      and(isNotNull(changelog.projectId), eq(projects.workspaceId, ws.id))
    )
    .orderBy(asc(changelog.createdAt));

  const changelogData = changelogRows.map((c) => ({
    id: c.id,
    description: c.description,
    projectId: c.projectId ?? "",
    projectName: c.projectName ?? null,
    date: (c.createdAt as Date).toISOString(),
  }));

  return (
    <CalendarView
      tasks={tasksData}
      projects={projectsData}
      notes={notesData}
      changelog={changelogData}
      userId={session.user.id}
    />
  );
}
