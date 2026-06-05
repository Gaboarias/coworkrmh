/**
 * Debug — snapshot del status de TODOS los proyectos del workspace activo.
 *
 * GET /api/admin/debug/project-status-snapshot
 *
 * Devuelve:
 *  - rows: cada proyecto con id, name, status (raw del DB).
 *  - countByStatus: agregado SQL GROUP BY status.
 *  - countByStatusJs: agregado en JS por las mismas filas (sanity check).
 *
 * Si la DB tiene status='firmado' pero el JS lo cuenta como 'prospecto' o 0,
 * hay un bug en el mapeo. Si la DB no tiene 'firmado' aunque el usuario
 * lo guardó, el bug está en updateProject / enum.
 *
 * Auth: admin role. Borrar después de diagnosticar.
 */

import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ws = await getActiveWorkspace();
  if (!ws) {
    return NextResponse.json({ error: "Sin entorno activo" }, { status: 400 });
  }

  // Raw rows
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      bucketId: projects.bucketId,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.workspaceId, ws.id));

  // GROUP BY status via SQL
  const groupRows = await db
    .select({
      status: projects.status,
      n: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(eq(projects.workspaceId, ws.id))
    .groupBy(projects.status);
  const countByStatusSql: Record<string, number> = {};
  for (const g of groupRows) countByStatusSql[g.status as string] = g.n;

  // GROUP BY en JS (sanity check)
  const countByStatusJs: Record<string, number> = {};
  for (const r of rows) {
    const k = r.status as string;
    countByStatusJs[k] = (countByStatusJs[k] ?? 0) + 1;
  }

  return NextResponse.json({
    workspace: { id: ws.id, name: ws.name },
    totalProjects: rows.length,
    countByStatusSql,
    countByStatusJs,
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      bucketId: r.bucketId,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })),
  });
}
