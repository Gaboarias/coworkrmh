import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const GUARD = "rmh-fixpk-3e7c91a0d2";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const before = rows(
    await db.execute(sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'project_members'::regclass AND contype = 'p'
    `)
  );

  const dupes = rows(
    await db.execute(sql`
      SELECT project_id, user_id, count(*)::int AS n
      FROM project_members
      GROUP BY project_id, user_id
      HAVING count(*) > 1
    `)
  );

  // Remove duplicate (project_id, user_id) rows, keep one.
  await db.execute(sql`
    DELETE FROM project_members a
    USING project_members b
    WHERE a.ctid < b.ctid
      AND a.project_id = b.project_id
      AND a.user_id = b.user_id
  `);

  // Ensure key columns are NOT NULL (required for primary key).
  await db.execute(
    sql`ALTER TABLE project_members ALTER COLUMN project_id SET NOT NULL`
  );
  await db.execute(
    sql`ALTER TABLE project_members ALTER COLUMN user_id SET NOT NULL`
  );

  // Add the composite primary key only if none exists.
  if (before.length === 0) {
    await db.execute(
      sql`ALTER TABLE project_members ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id)`
    );
  }

  const after = rows(
    await db.execute(sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'project_members'::regclass AND contype = 'p'
    `)
  );

  return NextResponse.json({
    ok: true,
    pkBefore: before,
    duplicatesFound: dupes,
    pkAfter: after,
  });
}
