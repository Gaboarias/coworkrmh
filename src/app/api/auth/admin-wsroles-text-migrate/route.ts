import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — convierte workspace_members.role del enum a text para
// soportar roles custom. Borrar tras aplicar.
const GUARD = "rmh-wsrolestext-d2f8b914a3";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Convertir el column type a text (idempotente: no-op si ya es text).
  await db.execute(
    sql`ALTER TABLE workspace_members ALTER COLUMN role TYPE text USING role::text`
  );
  // Reafirmar default 'member' (en caso de que el ALTER haya dejado el default ligado al enum).
  await db.execute(
    sql`ALTER TABLE workspace_members ALTER COLUMN role SET DEFAULT 'member'`
  );
  // Dropear el enum si ya nada lo usa (idempotente con IF EXISTS).
  await db.execute(sql`DROP TYPE IF EXISTS workspace_role`);

  // Verificar tipo del column post-migración.
  const colInfo = rows(
    await db.execute(sql`
      SELECT data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'workspace_members' AND column_name = 'role'
    `)
  );
  const dist = rows(
    await db.execute(sql`
      SELECT role, count(*)::int AS n
      FROM workspace_members GROUP BY role ORDER BY role
    `)
  );
  return NextResponse.json({ ok: true, columnInfo: colInfo, roleDistribution: dist });
}
