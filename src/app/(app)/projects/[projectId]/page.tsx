import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  tasks,
  workspaceMembers,
  projectMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProjectTasksView } from "@/components/projects/ProjectTasksView";
import { ensureWorkspaceForResource } from "@/lib/workspace";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await auth();
  const role = (session?.user?.role as string) ?? "";
  const isManager = role === "admin" || role === "manager";

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  await ensureWorkspaceForResource(
    project.workspaceId,
    `/projects/${params.projectId}`
  );

  // Las 3 queries son independientes entre sí — paralelizar.
  // Asignables = UNION de (workspaceMembers) ∪ (projectMembers). El union
  // resuelve:
  //   1. Workspace members nuevos aparecen sin agregarlos explícitamente.
  //   2. DATA LEGACY: users agregados directo a projectMembers (sin pasar
  //      por workspace) — ej. Jorge Castillo en Midnight Trouble.
  const [taskRows, wsMemberRows, pjMemberRows] = await Promise.all([
    db
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
        createdAt: tasks.createdAt,
        assigneeName: users.name,
        assigneeEmail: users.email,
        assigneeAvatarUrl: users.avatarUrl,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(
        and(eq(tasks.projectId, params.projectId), isNull(tasks.parentTaskId))
      )
      .orderBy(asc(tasks.position)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, project.workspaceId)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, params.projectId)),
  ]);

  const tasksData = taskRows.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    parentTaskId: t.parentTaskId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    dueDate: t.dueDate,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    position: t.position,
    createdBy: t.createdBy,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    assignee: t.assigneeId
      ? {
          id: t.assigneeId,
          name: t.assigneeName ?? null,
          email: t.assigneeEmail ?? "",
          avatarUrl: t.assigneeAvatarUrl ?? null,
        }
      : null,
  }));

  // Dedup por user.id, priorizando wsMember (mismo id → mismo user, da igual).
  const memberMap = new Map<
    string,
    { id: string; name: string | null; email: string; avatarUrl: string | null }
  >();
  for (const row of [...wsMemberRows, ...pjMemberRows]) {
    if (row.id && !memberMap.has(row.id)) {
      memberMap.set(row.id, {
        id: row.id,
        name: row.name ?? null,
        email: row.email ?? "",
        avatarUrl: row.avatarUrl ?? null,
      });
    }
  }
  const members = Array.from(memberMap.values());

  return (
    <ProjectTasksView
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
      }}
      tasks={tasksData}
      members={members}
      canEdit={isManager}
    />
  );
}
