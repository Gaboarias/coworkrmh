import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — Fase 0 demolición ERP/roles. Borrar tras aplicar.
const GUARD = "rmh-demo-7f31c8a05e";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 1. Tablas ERP/roles (CASCADE: arrastra FKs/índices). Idempotente.
  for (const t of [
    "product_cost_history",
    "quote_items",
    "quotes",
    "sales",
    "expenses",
    "products",
    "product_categories",
    "bucket_members",
    "profiles",
  ]) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${t}" CASCADE`));
  }

  // 2. Enums ERP (currency NO se toca: lo usan payments/client_accounts).
  for (const e of ["product_status", "quote_status", "expense_kind"]) {
    await db.execute(sql.raw(`DROP TYPE IF EXISTS "${e}"`));
  }

  // 3. Columnas añadidas a tablas que se conservan.
  await db.execute(
    sql`ALTER TABLE buckets DROP COLUMN IF EXISTS team_agreements`
  );
  await db.execute(
    sql`ALTER TABLE buckets DROP COLUMN IF EXISTS break_even_margin`
  );
  await db.execute(
    sql`ALTER TABLE clients DROP COLUMN IF EXISTS bucket_id`
  );

  const remaining = rows(
    await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN
        ('products','product_categories','product_cost_history','quotes',
         'quote_items','sales','expenses','bucket_members','profiles')
      ORDER BY table_name
    `)
  );
  return NextResponse.json({ ok: true, remainingErpTables: remaining });
}
