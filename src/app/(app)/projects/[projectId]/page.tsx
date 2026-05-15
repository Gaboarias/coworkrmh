import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, tasks, projectMembers, users } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProjectTasksView } from "@/components/projects/ProjectTasksView";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const isManager = role === "admin" || role === "manager";

  // Fetch project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch top-level tasks with assignee info
  const taskRows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      parentTaskId: tasks.parentTaskId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      position: tasks.position,
      createdBy: tasks.createdBy,
      assigneeName: users.name,
      assigneeEmail: users.email,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(
      and(
        eq(tasks.projectId, params.projectId),
        isNull(tasks.parentTaskId)
      )
    )
    .orderBy(asc(tasks.position));

  // Shape tasks to match component interface (uses snake_case + nested assignee)
  const shapedTasks = taskRows.map((t) => ({
    id: t.id,
    project_id: t.projectId,
    parent_task_id: t.parentTaskId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignee_id: t.assigneeId,
    due_date: t.dueDate,
    completed_at: t.completedAt,
    position: t.position,
    created_by: t.createdBy,
    assignee: t.assigneeId
      ? {
          id: t.assigneeId,
          full_name: t.assigneeName ?? null,
          avatar_url: t.assigneeAvatarUrl ?? null,
          email: t.assigneeEmail ?? "",
        }
      : null,
  }));

  // Fetch project members
  const memberRows = await db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.projectId));

  const memberProfiles = memberRows
    .filter((m) => m.id != null)
    .map((m) => ({
      id: m.id!,
      full_name: m.name ?? null,
      email: m.email ?? "",
      avatar_url: m.avatarUrl ?? null,
    }));

  // Shape project to match Supabase-typed component (snake_case)
  const shapedProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    color: project.color,
    bucket_id: project.bucketId,
    due_date: project.dueDate,
    created_by: project.createdBy,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };

  return (
    <ProjectTasksView
      project={shapedProject as any}
      tasks={shapedTasks as any}
      members={memberProfiles}
      canEdit={isManager}
    />
  );
}
