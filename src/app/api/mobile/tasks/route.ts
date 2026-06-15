import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, projects, workspaceMembers } from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/auth-bearer";
import { todayYmdCR } from "@/lib/utils/datetime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await verifyBearerToken(
    request.headers.get("authorization") ?? undefined
  );
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.sub));

  if (!memberships.length) return NextResponse.json({ tasks: [] });

  const wsIds = memberships.map((m) => m.workspaceId);

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: projects.id,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, user.sub),
        ne(tasks.status, "done"),
        inArray(projects.workspaceId, wsIds)
      )
    )
    .orderBy(tasks.dueDate, tasks.position)
    .limit(100);

  const today = todayYmdCR();

  return NextResponse.json({
    tasks: rows.map((t) => ({
      ...t,
      isOverdue: !!t.dueDate && t.dueDate < today,
    })),
  });
}
