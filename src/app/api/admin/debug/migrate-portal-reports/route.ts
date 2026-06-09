/**
 * One-shot — migración portal de clientes + reportes entregables.
 *
 * POST /api/admin/debug/migrate-portal-reports
 *
 * Aplica:
 *  1. ALTER TABLE clients ADD COLUMN portal_token uuid UNIQUE
 *  2. CREATE TABLE client_reports (+ FK + índices)
 *
 * Idempotente (IF NOT EXISTS / IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Auth: admin role.
 *
 * Cómo correr (desde la consola del browser, ya logueado como admin):
 *   fetch("/api/admin/debug/migrate-portal-reports", { method: "POST" }).then(r => r.json()).then(console.log)
 *
 * Eliminar este endpoint después del run exitoso.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STEPS: Array<{ name: string; ddl: string }> = [
  {
    name: "clients_add_portal_token",
    ddl: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_token uuid`,
  },
  {
    name: "clients_portal_token_unique",
    ddl: `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'clients_portal_token_unique'
        ) THEN
          ALTER TABLE clients ADD CONSTRAINT clients_portal_token_unique UNIQUE (portal_token);
        END IF;
      END $$
    `,
  },
  {
    name: "create_client_reports",
    ddl: `
      CREATE TABLE IF NOT EXISTS client_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
        title text NOT NULL,
        description text,
        file_url text,
        mime_type text,
        size_bytes integer,
        report_date date,
        is_published boolean NOT NULL DEFAULT false,
        created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `,
  },
  {
    name: "client_reports_project_idx",
    ddl: `CREATE INDEX IF NOT EXISTS client_reports_project_idx ON client_reports (project_id)`,
  },
  {
    name: "client_reports_client_idx",
    ddl: `CREATE INDEX IF NOT EXISTS client_reports_client_idx ON client_reports (client_id)`,
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];

  for (const step of STEPS) {
    try {
      await db.execute(sql.raw(step.ddl));
      results.push({ name: step.name, ok: true });
    } catch (e) {
      results.push({
        name: step.name,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    total: STEPS.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

export async function GET() {
  return NextResponse.json({
    message: "POST a este endpoint para aplicar la migración portal + reportes",
    steps: STEPS.map((s) => s.name),
  });
}
