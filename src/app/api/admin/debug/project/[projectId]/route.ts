/**
 * Endpoint temporal de diagnóstico — admin lo invoca con un projectId y
 * devuelve la verdad sobre membresías para descubrir por qué un user
 * (ej. Jorge Castillo) no aparece en el dropdown de asignar tareas.
 *
 * GET /api/admin/debug/project/[projectId]
 *
 * Response: {
 *   project: { id, name, workspaceId },
 *   workspace: { id, name },
 *   workspaceMembers: [{ id, name, email, role }],
 *   projectMembers: [{ id, name, email, role }],
 *   summary: { wsCount, pmCount, inDropdown: wsCount }
 * }
 *
 * Auth: admin role required. Eliminar este endpoint después de diagnosticar.
 */

import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  workspaces,
  workspaceMembers,
  projectMembers,
  users,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      workspaceId: projects.workspaceId,
    })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, project.workspaceId))
    .limit(1);

  const wsMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, project.workspaceId))
    .orderBy(asc(users.name));

  const pjMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.projectId))
    .orderBy(asc(users.name));

  return NextResponse.json({
    project,
    workspace,
    workspaceMembers: wsMembers,
    projectMembers: pjMembers,
    summary: {
      wsCount: wsMembers.length,
      pmCount: pjMembers.length,
      inDropdown: wsMembers.length,
    },
  });
}
