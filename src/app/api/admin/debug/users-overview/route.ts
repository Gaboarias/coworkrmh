/**
 * Diagnóstico — overview de TODOS los users con sus workspaces y proyectos.
 *
 * GET /api/admin/debug/users-overview
 *
 * Devuelve: lista de users con
 *  - id, name, email, globalRole
 *  - workspaces[]: { id, name, role } — donde es workspaceMember
 *  - projects[]: { id, name, workspaceName, role } — donde es projectMember
 *  - orphan: bool — true si NO tiene ni workspaces ni projects (caso "invitado pero nunca asignado")
 *
 * Útil para encontrar users como los 2 de Marco que aparecen en /admin
 * pero no tienen workspace assignment.
 *
 * Auth: admin role. Eliminar después de diagnosticar.
 */

import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  workspaces,
  workspaceMembers,
  projects,
  projectMembers,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      globalRole: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));

  const allWsMembers = await db
    .select({
      userId: workspaceMembers.userId,
      workspaceId: workspaceMembers.workspaceId,
      workspaceName: workspaces.name,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id));

  const allPjMembers = await db
    .select({
      userId: projectMembers.userId,
      projectId: projectMembers.projectId,
      projectName: projects.name,
      workspaceId: projects.workspaceId,
      workspaceName: workspaces.name,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id));

  // Agrupar por user.
  const userMap = new Map<string, ReturnType<typeof formatUser>>();
  for (const u of allUsers) {
    userMap.set(u.id, formatUser(u));
  }
  for (const m of allWsMembers) {
    const u = userMap.get(m.userId);
    if (!u) continue;
    u.workspaces.push({
      id: m.workspaceId,
      name: m.workspaceName,
      role: m.role,
    });
  }
  for (const m of allPjMembers) {
    const u = userMap.get(m.userId);
    if (!u) continue;
    u.projects.push({
      id: m.projectId,
      name: m.projectName,
      workspaceName: m.workspaceName,
      role: m.role,
    });
  }

  const result = Array.from(userMap.values()).map((u) => ({
    ...u,
    orphan: u.workspaces.length === 0 && u.projects.length === 0,
  }));

  const orphans = result.filter((u) => u.orphan);

  return NextResponse.json({
    totalUsers: result.length,
    orphanCount: orphans.length,
    orphans: orphans.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      globalRole: u.globalRole,
      createdAt: u.createdAt,
    })),
    users: result,
  });
}

function formatUser(u: {
  id: string;
  name: string | null;
  email: string | null;
  globalRole: string | null;
  createdAt: Date | null;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    globalRole: u.globalRole,
    createdAt: u.createdAt?.toISOString() ?? null,
    workspaces: [] as Array<{ id: string; name: string; role: string }>,
    projects: [] as Array<{
      id: string;
      name: string;
      workspaceName: string;
      role: string;
    }>,
  };
}
