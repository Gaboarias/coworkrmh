import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — Fase 1 entornos. Borrar tras aplicar.
const GUARD = "rmh-ws-2d9a4c61f8";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1. Tablas.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      color text NOT NULL DEFAULT '#6B5FE4',
      created_by uuid NOT NULL REFERENCES users(id),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id)
    )
  `);

  // 2. Columna projects.workspace_id (nullable primero para backfill).
  await db.execute(
    sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE`
  );

  // 3. Entorno por defecto "General" (idempotente).
  const adminRows = rows(
    await db.execute(sql`
      SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1
    `)
  ) as { id: string }[];
  const fallbackUser = rows(
    await db.execute(sql`SELECT id FROM users ORDER BY created_at LIMIT 1`)
  ) as { id: string }[];
  const ownerId = adminRows[0]?.id ?? fallbackUser[0]?.id;

  let defaultWs = (
    rows(
      await db.execute(
        sql`SELECT id FROM workspaces WHERE name = 'General' LIMIT 1`
      )
    ) as { id: string }[]
  )[0]?.id;

  if (!defaultWs && ownerId) {
    const created = rows(
      await db.execute(sql`
        INSERT INTO workspaces (name, color, created_by)
        VALUES ('General', '#6B5FE4', ${ownerId})
        RETURNING id
      `)
    ) as { id: string }[];
    defaultWs = created[0]?.id;
  }

  if (defaultWs) {
    // 4. Backfill proyectos sin entorno.
    await db.execute(
      sql`UPDATE projects SET workspace_id = ${defaultWs} WHERE workspace_id IS NULL`
    );
    // 5. Todos los usuarios → miembros del entorno por defecto.
    await db.execute(sql`
      INSERT INTO workspace_members (workspace_id, user_id)
      SELECT ${defaultWs}, id FROM users
      ON CONFLICT DO NOTHING
    `);
    // 6. Ya con datos: NOT NULL.
    await db.execute(
      sql`ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL`
    );
  }

  const wsCount = rows(
    await db.execute(sql`SELECT count(*)::int AS n FROM workspaces`)
  );
  const orphanProjects = rows(
    await db.execute(
      sql`SELECT count(*)::int AS n FROM projects WHERE workspace_id IS NULL`
    )
  );
  return NextResponse.json({
    ok: true,
    defaultWorkspace: defaultWs ?? null,
    workspaces: wsCount,
    orphanProjects,
  });
}
