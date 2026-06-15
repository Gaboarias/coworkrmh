import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tasks, workspaceMembers } from "@/lib/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/auth-bearer";
import { todayYmdCR } from "@/lib/utils/datetime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await verifyBearerToken(
    request.headers.get("authorization") ?? undefined
  );
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.sub));

  if (!memberships.length)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const wsIds = memberships.map((m) => m.workspaceId);

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      status: projects.status,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, params.id),
        inArray(projects.workspaceId, wsIds)
      )
    )
    .limit(1);

  if (!project)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(eq(tasks.projectId, params.id))
    .orderBy(tasks.status, asc(tasks.position))
    .limit(200);

  const today = todayYmdCR();

  return NextResponse.json({
    project,
    tasks: projectTasks.map((t) => ({
      ...t,
      isOverdue: !!t.dueDate && t.dueDate < today,
    })),
  });
}
