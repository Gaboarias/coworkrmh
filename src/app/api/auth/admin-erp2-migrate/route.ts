import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — Fase 2 ERP del Excel. Borrar tras aplicar.
const GUARD = "rmh-erp2-8a14d6e2b3";

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
      CREATE TYPE "erp_expense_kind" AS ENUM ('investment','fixed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await db.execute(
    sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS team_agreements text`
  );
  await db.execute(
    sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS break_even_margin numeric(5,4) NOT NULL DEFAULT 0.45`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name text NOT NULL,
      category text,
      materials_cost numeric(12,2) NOT NULL DEFAULT 0,
      labor_cost numeric(12,2) NOT NULL DEFAULT 0,
      price numeric(12,2) NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_quotes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title text NOT NULL,
      customer_name text,
      iva_rate numeric(5,4) NOT NULL DEFAULT 0.13,
      status text NOT NULL DEFAULT 'draft',
      notes text,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_quote_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_id uuid NOT NULL REFERENCES erp_quotes(id) ON DELETE CASCADE,
      description text NOT NULL,
      qty numeric(12,2) NOT NULL DEFAULT 1,
      unit_cost numeric(12,2) NOT NULL DEFAULT 0,
      unit_price numeric(12,2) NOT NULL DEFAULT 0,
      sort_order integer NOT NULL DEFAULT 0
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      sale_date date NOT NULL,
      description text NOT NULL,
      client_name text,
      category text,
      qty numeric(12,2) NOT NULL DEFAULT 1,
      unit_cost numeric(12,2) NOT NULL DEFAULT 0,
      unit_price numeric(12,2) NOT NULL DEFAULT 0,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      kind erp_expense_kind NOT NULL,
      concept text NOT NULL,
      amount numeric(12,2) NOT NULL DEFAULT 0,
      category text,
      priority text,
      created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS erp_team (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name text NOT NULL,
      role text,
      responsibilities text,
      compensation text,
      status text NOT NULL DEFAULT 'active',
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_products_ws_idx ON erp_products (workspace_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_quotes_ws_idx ON erp_quotes (workspace_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_quote_items_quote_idx ON erp_quote_items (quote_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_sales_ws_date_idx ON erp_sales (workspace_id, sale_date)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_expenses_ws_kind_idx ON erp_expenses (workspace_id, kind)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS erp_team_ws_idx ON erp_team (workspace_id)`
  );

  const tables = rows(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE 'erp_%'
      ORDER BY table_name
    `)
  );
  return NextResponse.json({ ok: true, tables });
}
