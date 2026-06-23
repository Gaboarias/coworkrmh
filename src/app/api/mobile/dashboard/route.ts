import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, projects, workspaceMembers, taskAssignees } from "@/lib/db/schema";
import { eq, and, ne, inArray, count, lte } from "drizzle-orm";
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

  if (!memberships.length) {
    return NextResponse.json({ urgentTasks: [], pendingCount: 0, projectsCount: 0 });
  }

  const wsIds = memberships.map((m) => m.workspaceId);
  const today = todayYmdCR();

  const d = new Date(today + "T12:00:00Z");
  d.setDate(d.getDate() + 7);
  const in7Days = d.toISOString().slice(0, 10);

  const [urgentTasks, [pendingRow], [projectsRow]] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .where(
        and(
          eq(taskAssignees.userId, user.sub),
          ne(tasks.status, "done"),
          inArray(projects.workspaceId, wsIds),
          lte(tasks.dueDate, in7Days)
        )
      )
      .orderBy(tasks.dueDate)
      .limit(10),

    db
      .select({ count: count() })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .where(
        and(
          eq(taskAssignees.userId, user.sub),
          ne(tasks.status, "done"),
          inArray(projects.workspaceId, wsIds)
        )
      ),

    db
      .select({ count: count() })
      .from(projects)
      .where(
        and(
          inArray(projects.workspaceId, wsIds),
          ne(projects.status, "archived")
        )
      ),
  ]);

  return NextResponse.json({
    urgentTasks: urgentTasks.map((t) => ({
      ...t,
      isOverdue: !!t.dueDate && t.dueDate < today,
    })),
    pendingCount: pendingRow?.count ?? 0,
    projectsCount: projectsRow?.count ?? 0,
  });
}
