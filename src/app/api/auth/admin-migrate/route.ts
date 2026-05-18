import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const GUARD = "rmh-migrate-9b2e44f1c7a8";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1. New project_status enum values (idempotent; each its own statement)
  await db.execute(
    sql`ALTER TYPE "project_status" ADD VALUE IF NOT EXISTS 'paused'`
  );
  await db.execute(
    sql`ALTER TYPE "project_status" ADD VALUE IF NOT EXISTS 'in_review'`
  );
  await db.execute(
    sql`ALTER TYPE "project_status" ADD VALUE IF NOT EXISTS 'stopped'`
  );

  // 2. Project date columns
  await db.execute(
    sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date date`
  );
  await db.execute(
    sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date date`
  );

  // 3. Seed default bucket categories (only if none exist and an admin exists)
  await db.execute(sql`
    INSERT INTO buckets (name, color, position, created_by)
    SELECT v.name, v.color, v.pos,
           (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
    FROM (VALUES
      ('Marca', '#FF2E72', 0),
      ('Video', '#FFC857', 1),
      ('Web', '#6E83FF', 2),
      ('Social', '#9967CA', 3),
      ('Operaciones', '#A8D3A8', 4)
    ) AS v(name, color, pos)
    WHERE NOT EXISTS (SELECT 1 FROM buckets)
      AND EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  `);

  const enumVals = await db.execute(sql`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = 'project_status'::regtype ORDER BY enumsortorder
  `);
  const bucketCount = await db.execute(sql`SELECT count(*)::int AS n FROM buckets`);

  return NextResponse.json({
    ok: true,
    project_status: enumVals.rows ?? enumVals,
    buckets: bucketCount.rows ?? bucketCount,
  });
}
