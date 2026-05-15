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

  // Shape to match CalendarView interface (snake_case with nested projects)
  const shapedTasks = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority as any,
    due_date: t.dueDate!,
    project_id: t.projectId ?? "",
    assignee_id: t.assigneeId ?? null,
    projects: t.projectName
      ? { name: t.projectName, color: t.projectColor ?? null }
      : null,
  }));

  return <CalendarView tasks={shapedTasks} userId={session.user.id} />;
}
