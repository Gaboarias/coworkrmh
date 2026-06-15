import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, workspaceMembers, tasks } from "@/lib/db/schema";
import { eq, and, ne, inArray, count, sql } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/auth-bearer";

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

  if (!memberships.length) return NextResponse.json({ projects: [] });

  const wsIds = memberships.map((m) => m.workspaceId);

  const rows = await db
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
        inArray(projects.workspaceId, wsIds),
        ne(projects.status, "archived")
      )
    )
    .orderBy(projects.createdAt)
    .limit(50);

  if (!rows.length) return NextResponse.json({ projects: [] });

  const projectIds = rows.map((p) => p.id);

  const taskCounts = await db
    .select({
      projectId: tasks.projectId,
      total: count(),
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')`.mapWith(
        Number
      ),
    })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId);

  const countMap = new Map(taskCounts.map((r) => [r.projectId, r]));

  return NextResponse.json({
    projects: rows.map((p) => {
      const c = countMap.get(p.id);
      return { ...p, taskTotal: c?.total ?? 0, taskDone: c?.done ?? 0 };
    }),
  });
}
