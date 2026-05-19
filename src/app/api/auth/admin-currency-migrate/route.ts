import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded migration (moneda text → enum currency). Delete after applying.
const GUARD = "rmh-cur-5b8e2f10a7";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Asegurar que el tipo enum exista (creado en migración ERP; idempotente).
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "currency" AS ENUM ('CRC','USD');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Backfill: cualquier valor fuera de CRC/USD → CRC (decisión documentada).
  await db.execute(
    sql`UPDATE payments SET currency='CRC' WHERE currency NOT IN ('CRC','USD')`
  );
  await db.execute(
    sql`UPDATE client_accounts SET currency='CRC' WHERE currency NOT IN ('CRC','USD')`
  );

  // Convertir columnas text → enum solo si todavía son text (idempotente).
  await db.execute(sql`
    DO $$ BEGIN
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_name='payments' AND column_name='currency') = 'text' THEN
        ALTER TABLE payments ALTER COLUMN currency DROP DEFAULT;
        ALTER TABLE payments ALTER COLUMN currency TYPE currency USING currency::currency;
        ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'CRC';
      END IF;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_name='client_accounts' AND column_name='currency') = 'text' THEN
        ALTER TABLE client_accounts ALTER COLUMN currency DROP DEFAULT;
        ALTER TABLE client_accounts ALTER COLUMN currency TYPE currency USING currency::currency;
        ALTER TABLE client_accounts ALTER COLUMN currency SET DEFAULT 'CRC';
      END IF;
    END $$;
  `);

  const cols = rows(
    await db.execute(sql`
      SELECT table_name, udt_name, column_default
      FROM information_schema.columns
      WHERE column_name='currency'
        AND table_name IN ('payments','client_accounts')
      ORDER BY table_name
    `)
  );
  return NextResponse.json({ ok: true, currency_columns: cols });
}
