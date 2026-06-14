import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/admin/migrate-workspace-members
 *
 * One-shot migration: inserta en workspace_members a todos los usuarios que
 * tienen project_members en un proyecto de ese workspace pero NO aparecen
 * en workspace_members para ese mismo workspace.
 *
 * Idempotente — usa ON CONFLICT DO NOTHING. Puede ejecutarse varias veces
 * sin efectos secundarios.
 *
 * Solo admin. Devuelve { migrated: number }.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });
  }

  const result = await db.execute(sql`
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    SELECT DISTINCT
      p.workspace_id,
      pm.user_id,
      'member',
      NOW()
    FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = p.workspace_id
        AND wm.user_id = pm.user_id
    )
    ON CONFLICT DO NOTHING
  `);

  const migrated = result.rowCount ?? 0;
  return NextResponse.json({ migrated });
}
