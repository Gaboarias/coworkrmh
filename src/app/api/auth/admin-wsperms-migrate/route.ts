import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_WS_ROLE_PERMISSIONS } from "@/lib/constants/workspacePermissions";

// TEMP guarded — Fase 2: matriz de permisos por entorno. Borrar tras aplicar.
const GUARD = "rmh-wsperms-7c4e2a91d6";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // JSON por defecto (literal SQL seguro: las claves no llevan comillas simples).
  const defaultJson = JSON.stringify(DEFAULT_WS_ROLE_PERMISSIONS).replace(
    /'/g,
    "''"
  );

  // Columna jsonb nullable primero (idempotente).
  await db.execute(
    sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS role_permissions jsonb`
  );
  // Backfill filas existentes (incluye las que quedaron NULL).
  await db.execute(
    sql.raw(
      `UPDATE workspaces SET role_permissions = '${defaultJson}'::jsonb WHERE role_permissions IS NULL`
    )
  );
  // Default + NOT NULL para inserciones futuras.
  await db.execute(
    sql.raw(
      `ALTER TABLE workspaces ALTER COLUMN role_permissions SET DEFAULT '${defaultJson}'::jsonb`
    )
  );
  await db.execute(
    sql`ALTER TABLE workspaces ALTER COLUMN role_permissions SET NOT NULL`
  );

  const sample = rows(
    await db.execute(sql`
      SELECT id, name, role_permissions
      FROM workspaces ORDER BY name LIMIT 5
    `)
  );
  const [{ n }] = rows(
    await db.execute(
      sql`SELECT count(*)::int AS n FROM workspaces WHERE role_permissions IS NOT NULL`
    )
  ) as { n: number }[];
  return NextResponse.json({ ok: true, withPermissions: n, sample });
}
