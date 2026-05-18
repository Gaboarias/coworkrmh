import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const GUARD = "rmh-fixpk-3e7c91a0d2";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1. Dedupe any duplicate (project_id, user_id) rows, keeping one.
  await db.execute(sql`
    DELETE FROM project_members a
    USING project_members b
    WHERE a.ctid < b.ctid
      AND a.project_id = b.project_id
      AND a.user_id = b.user_id
  `);

  // 2. Add composite primary key only if no PK exists yet.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'project_members'::regtype AND contype = 'p'
      ) THEN
        ALTER TABLE project_members
          ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);
      END IF;
    END $$;
  `);

  const pk = await db.execute(sql`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'project_members'::regtype AND contype = 'p'
  `);

  return NextResponse.json({ ok: true, pk: pk.rows ?? pk });
}
