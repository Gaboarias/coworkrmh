import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded migration (Fase 2 ERP). Delete after applying.
const GUARD = "rmh-erp-9c3b71d0a4";

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
      CREATE TYPE "quote_status" AS ENUM ('draft','sent','accepted','rejected');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "expense_kind" AS ENUM ('investment','fixed_monthly');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await db.execute(
    sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS bucket_id uuid REFERENCES buckets(id) ON DELETE SET NULL`
  );
  await db.execute(
    sql`ALTER TABLE buckets ADD COLUMN IF NOT EXISTS break_even_margin numeric(5,4)`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
      title varchar(200) NOT NULL,
      customer_name varchar(200),
      iva_rate numeric(5,4) NOT NULL DEFAULT 0.13,
      status quote_status NOT NULL DEFAULT 'draft',
      notes text,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quote_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      description text NOT NULL,
      qty numeric(12,2) NOT NULL DEFAULT 1,
      unit_cost numeric(12,2) NOT NULL DEFAULT 0,
      unit_price numeric(12,2) NOT NULL DEFAULT 0,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      sale_date date NOT NULL,
      description text NOT NULL,
      client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
      client_name varchar(200),
      category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
      qty numeric(12,2) NOT NULL DEFAULT 1,
      unit_cost numeric(12,2) NOT NULL DEFAULT 0,
      unit_price numeric(12,2) NOT NULL DEFAULT 0,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id uuid NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
      kind expense_kind NOT NULL,
      concept varchar(200) NOT NULL,
      amount numeric(12,2) NOT NULL DEFAULT 0,
      category varchar(80),
      priority text,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS quotes_bucket_idx ON quotes (bucket_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS quote_items_quote_idx ON quote_items (quote_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS sales_bucket_date_idx ON sales (bucket_id, sale_date)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS expenses_bucket_kind_idx ON expenses (bucket_id, kind)`
  );

  const tables = rows(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN
        ('quotes','quote_items','sales','expenses')
      ORDER BY table_name
    `)
  );
  return NextResponse.json({ ok: true, tables });
}
