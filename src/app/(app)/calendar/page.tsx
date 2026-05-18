import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, isNotNull, asc } from "drizzle-orm";
import { CalendarView } from "@/components/calendar/CalendarView";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

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
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(isNotNull(tasks.dueDate))
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

  return <CalendarView tasks={tasksData} userId={session.user.id} />;
}
