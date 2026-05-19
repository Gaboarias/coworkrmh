import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — Fase 1: rol por miembro de entorno. Borrar tras aplicar.
const GUARD = "rmh-wsrole-3b8c1f5d92";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "workspace_role" AS ENUM ('owner','admin','member');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(
    sql`ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS role workspace_role NOT NULL DEFAULT 'member'`
  );

  // Backfill: el creador de cada entorno es owner de su membresía.
  await db.execute(sql`
    UPDATE workspace_members wm
    SET role = 'owner'
    FROM workspaces w
    WHERE wm.workspace_id = w.id
      AND wm.user_id = w.created_by
      AND wm.role <> 'owner'
  `);

  // Si el creador no tiene fila de membresía, crearla como owner.
  await db.execute(sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, w.created_by, 'owner'
    FROM workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM workspace_members m
      WHERE m.workspace_id = w.id AND m.user_id = w.created_by
    )
    ON CONFLICT DO NOTHING
  `);

  const dist = rows(
    await db.execute(sql`
      SELECT role, count(*)::int AS n
      FROM workspace_members GROUP BY role ORDER BY role
    `)
  );
  return NextResponse.json({ ok: true, roleDistribution: dist });
}
