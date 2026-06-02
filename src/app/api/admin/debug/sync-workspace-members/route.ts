/**
 * Migración one-shot — sincroniza projectMembers ↔ workspaceMembers.
 *
 * Problema: data legacy donde users fueron agregados directo a
 * projectMembers (via /projects/[id]/config) sin estar en workspaceMembers
 * del workspace correspondiente. Esos users NO podían ni ver el workspace
 * (canAccessWorkspace rechaza) ni ser asignados a tareas (dropdown vacío).
 *
 * Estrategia: por cada row en projectMembers, asegurar que el (userId,
 * project.workspaceId) exista en workspaceMembers con role=member. Si ya
 * existe (caso normal), skipea via onConflictDoNothing.
 *
 * GET — preview (dry-run): qué rows se insertarían, sin escribir.
 * POST — ejecuta los inserts.
 *
 * Auth: admin role. Idempotente: correrlo múltiples veces no hace daño,
 * solo agrega lo faltante.
 *
 * Eliminar este endpoint después de aplicar + verificar.
 */

import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  projectMembers,
  workspaceMembers,
  users,
  workspaces,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function computePlan() {
  // Levantar TODOS los projectMembers con el workspaceId del proyecto.
  const rows = await db
    .select({
      userId: projectMembers.userId,
      projectId: projectMembers.projectId,
      workspaceId: projects.workspaceId,
      projectName: projects.name,
      workspaceName: workspaces.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .innerJoin(users, eq(projectMembers.userId, users.id));

  // Levantar todos los workspaceMembers existentes (set para lookup O(1)).
  const wsRows = await db
    .select({
      userId: workspaceMembers.userId,
      workspaceId: workspaceMembers.workspaceId,
    })
    .from(workspaceMembers);

  const wsKey = (userId: string, workspaceId: string) =>
    `${userId}::${workspaceId}`;
  const wsSet = new Set(wsRows.map((r) => wsKey(r.userId, r.workspaceId)));

  // Para cada projectMember, ver si falta en workspaceMembers.
  const missing: Array<{
    userId: string;
    userName: string | null;
    userEmail: string | null;
    workspaceId: string;
    workspaceName: string;
    projectName: string;
  }> = [];

  // Dedup: un user puede ser projectMember de muchos proyectos en el mismo
  // workspace; solo necesitamos 1 insert por (user, workspace).
  const planned = new Set<string>();

  for (const row of rows) {
    const key = wsKey(row.userId, row.workspaceId);
    if (wsSet.has(key)) continue;
    if (planned.has(key)) continue;
    planned.add(key);
    missing.push({
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName,
      projectName: row.projectName,
    });
  }

  return missing;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const plan = await computePlan();
  return NextResponse.json({
    dryRun: true,
    wouldInsert: plan.length,
    rows: plan,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const plan = await computePlan();
  if (plan.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, note: "Nada que migrar" });
  }

  // Insert en bulk con onConflictDoNothing (safety extra por race conditions).
  await db
    .insert(workspaceMembers)
    .values(
      plan.map((p) => ({
        userId: p.userId,
        workspaceId: p.workspaceId,
        role: "member" as const,
      }))
    )
    .onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
    });

  return NextResponse.json({
    ok: true,
    inserted: plan.length,
    rows: plan,
  });
}
