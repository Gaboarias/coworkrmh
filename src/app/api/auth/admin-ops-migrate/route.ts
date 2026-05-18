import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded migration route (Operations PR 1). Delete after applying.
const GUARD = "rmh-ops-7d1f2a93c5";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1. Enums (idempotent).
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "product_status" AS ENUM ('active','archived','out_of_stock');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "currency" AS ENUM ('CRC','USD');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // 2. Extend changelog_action (each its own statement; cannot run in a tx).
  await db.execute(
    sql`ALTER TYPE "changelog_action" ADD VALUE IF NOT EXISTS 'product_created'`
  );
  await db.execute(
    sql`ALTER TYPE "changelog_action" ADD VALUE IF NOT EXISTS 'product_updated'`
  );
  await db.execute(
    sql`ALTER TYPE "changelog_action" ADD VALUE IF NOT EXISTS 'product_archived'`
  );

  // 3. Tables.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bucket_members (
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role user_role NOT NULL DEFAULT 'member',
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT bucket_members_pkey PRIMARY KEY (bucket_id, user_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS product_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      name varchar(120) NOT NULL,
      color varchar(7),
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
      name varchar(200) NOT NULL,
      description text,
      sku varchar(60),
      status product_status NOT NULL DEFAULT 'active',
      currency currency NOT NULL DEFAULT 'CRC',
      base_price numeric(12,2) NOT NULL DEFAULT 0,
      default_materials_cost numeric(12,2) NOT NULL DEFAULT 0,
      default_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
      image_url text,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      archived_at timestamp
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS product_cost_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      materials_cost numeric(12,2) NOT NULL,
      labor_cost numeric(12,2) NOT NULL,
      note text,
      changed_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      changed_at timestamp NOT NULL DEFAULT now()
    )
  `);

  // 4. Indexes (idempotent).
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS product_categories_bucket_name_unq ON product_categories (bucket_id, name)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS products_bucket_idx ON products (bucket_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS products_bucket_status_idx ON products (bucket_id, status)`
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS products_bucket_sku_unq ON products (bucket_id, sku) WHERE sku IS NOT NULL`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS product_cost_history_product_changed_idx ON product_cost_history (product_id, changed_at DESC)`
  );

  const tables = rows(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('bucket_members','product_categories','products','product_cost_history')
      ORDER BY table_name
    `)
  );
  const changelogVals = rows(
    await db.execute(sql`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = 'changelog_action'::regtype ORDER BY enumsortorder
    `)
  );

  return NextResponse.json({ ok: true, tables, changelog_action: changelogVals });
}
