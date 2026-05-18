import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { buckets, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SEED_PROFILES } from "@/lib/utils/permissions";

// TEMP guarded migration (Fase 1 roles por perfil). Delete after applying.
const GUARD = "rmh-roles-4a2f8e16b9";

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
    CREATE TABLE IF NOT EXISTS profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      name varchar(80) NOT NULL,
      description text,
      permissions json NOT NULL DEFAULT '[]'::json,
      is_system boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS profiles_bucket_name_unq ON profiles (bucket_id, name)`
  );

  await db.execute(
    sql`ALTER TABLE bucket_members ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL`
  );
  await db.execute(
    sql`ALTER TABLE bucket_members ADD COLUMN IF NOT EXISTS responsibilities text`
  );
  await db.execute(
    sql`ALTER TABLE bucket_members ADD COLUMN IF NOT EXISTS compensation text`
  );
  await db.execute(
    sql`ALTER TABLE bucket_members ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'active'`
  );
  await db.execute(
    sql`ALTER TABLE buckets ADD COLUMN IF NOT EXISTS team_agreements text`
  );

  // Sembrar perfiles por defecto en negocios existentes que no tengan ninguno.
  const allBuckets = await db.select({ id: buckets.id }).from(buckets);
  let seeded = 0;
  for (const b of allBuckets) {
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.bucketId, b.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(profiles).values(
        SEED_PROFILES.map((p, i) => ({
          bucketId: b.id,
          name: p.name,
          description: p.description,
          permissions: p.permissions,
          isSystem: true,
          sortOrder: i,
        }))
      );
      seeded++;
    }
  }

  const cols = rows(
    await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bucket_members' AND column_name IN
        ('profile_id','responsibilities','compensation','member_status')
      ORDER BY column_name
    `)
  );
  const profileCount = rows(
    await db.execute(sql`SELECT count(*)::int AS n FROM profiles`)
  );

  return NextResponse.json({
    ok: true,
    bucketMemberCols: cols,
    bucketsSeeded: seeded,
    profiles: profileCount,
  });
}
