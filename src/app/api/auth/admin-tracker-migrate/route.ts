import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded migration (Fase 3 tracker: etiquetas). Delete after applying.
const GUARD = "rmh-tracker-6f0a82d3e1";

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
    CREATE TABLE IF NOT EXISTS tags (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name varchar(60) NOT NULL,
      color varchar(7) NOT NULL DEFAULT '#6E83FF',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS tags_project_name_unq ON tags (project_id, name)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      CONSTRAINT task_tags_pkey PRIMARY KEY (task_id, tag_id)
    )
  `);

  const tables = rows(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('tags','task_tags')
      ORDER BY table_name
    `)
  );
  return NextResponse.json({ ok: true, tables });
}
