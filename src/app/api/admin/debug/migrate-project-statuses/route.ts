/**
 * One-shot — migrar el enum project_status a las nuevas etapas.
 *
 * POST /api/admin/debug/migrate-project-statuses
 *
 * Hace:
 *   1. ADD VALUE IF NOT EXISTS para los 6 nuevos statuses + archived
 *      (idempotente, no falla si ya están).
 *   2. UPDATE projects SET status='prospecto' donde el status es uno
 *      de los legacy (active, paused, in_review, stopped, completed).
 *   3. ALTER COLUMN status SET DEFAULT 'prospecto'.
 *
 * IMPORTANTE: ALTER TYPE ADD VALUE no se puede correr dentro de una
 * transacción explícita en Postgres. El driver Neon HTTP ejecuta cada
 * llamada a db.execute() como statement individual auto-commit, así que
 * funciona — pero las llamadas tienen que ser separadas, no batched.
 *
 * Idempotente: podés correrlo varias veces sin efecto adverso.
 *
 * Auth: admin role. Borrar después del run exitoso.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const NEW_VALUES = [
  "prospecto",
  "primer_contrato",
  "firmado",
  "descartado",
  "retomar",
  "operaciones",
];

const LEGACY_VALUES = [
  "active",
  "paused",
  "in_review",
  "stopped",
  "completed",
];

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: Array<{ step: string; ok: boolean; detail?: string }> = [];

  // Step 1: agregar nuevos valores al enum (idempotente desde PG10+).
  for (const v of NEW_VALUES) {
    try {
      await db.execute(
        sql.raw(`ALTER TYPE project_status ADD VALUE IF NOT EXISTS '${v}'`)
      );
      results.push({ step: `add_enum_value:${v}`, ok: true });
    } catch (err) {
      results.push({
        step: `add_enum_value:${v}`,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 2: contar cuántos proyectos tienen status legacy ANTES del update
  // (para el reporte de salida).
  let legacyCount = 0;
  try {
    const placeholders = LEGACY_VALUES.map((v) => `'${v}'`).join(", ");
    const res = (await db.execute(
      sql.raw(
        `SELECT count(*)::int AS n FROM projects WHERE status IN (${placeholders})`
      )
    )) as unknown as { rows?: Array<{ n: number }> } | Array<{ n: number }>;
    // neon-http devuelve `rows`; postgres-js devuelve directo array. Defensivo.
    const row = Array.isArray(res) ? res[0] : res.rows?.[0];
    legacyCount = row?.n ?? 0;
    results.push({
      step: "count_legacy_rows",
      ok: true,
      detail: `${legacyCount} proyectos con status legacy`,
    });
  } catch (err) {
    results.push({
      step: "count_legacy_rows",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 3: migrar legacy → 'prospecto'.
  try {
    const placeholders = LEGACY_VALUES.map((v) => `'${v}'`).join(", ");
    await db.execute(
      sql.raw(
        `UPDATE projects SET status = 'prospecto' WHERE status IN (${placeholders})`
      )
    );
    results.push({
      step: "migrate_legacy_to_prospecto",
      ok: true,
      detail: `${legacyCount} rows actualizadas`,
    });
  } catch (err) {
    results.push({
      step: "migrate_legacy_to_prospecto",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 4: cambiar el default de la columna a 'prospecto'.
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'prospecto'`
      )
    );
    results.push({ step: "set_default_prospecto", ok: true });
  } catch (err) {
    results.push({
      step: "set_default_prospecto",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    {
      ok: failed.length === 0,
      total: results.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
      legacyMigrated: legacyCount,
      results,
    },
    { status: failed.length === 0 ? 200 : 500 }
  );
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST a este endpoint para migrar el enum project_status. Idempotente.",
    newValues: NEW_VALUES,
    legacyValues: LEGACY_VALUES,
  });
}
