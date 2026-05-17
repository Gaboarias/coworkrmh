import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const GUARD = "rmh-migrate-9b2e44f1c7a8";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Idempotent: align live `tasks` table with the Drizzle schema.
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid`);
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamp`);
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()`);

  const cols = await db.execute(sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'tasks' ORDER BY ordinal_position
  `);

  return NextResponse.json({ ok: true, tasks_columns: cols.rows ?? cols });
}
