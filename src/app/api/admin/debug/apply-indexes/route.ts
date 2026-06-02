/**
 * One-shot — aplicar índices DB del audit S+2.
 *
 * POST /api/admin/debug/apply-indexes
 *
 * Crea con `CREATE INDEX IF NOT EXISTS` los índices declarados en schema.ts
 * (drizzle-kit no está cableado al repo, así que aplicamos a mano vía SQL).
 *
 * Idempotente. Auth: admin role.
 *
 * Cómo correr (desde la consola del browser, ya logueado como admin):
 *   fetch("/api/admin/debug/apply-indexes", { method: "POST" }).then(r => r.json()).then(console.log)
 *
 * Eliminar este endpoint después del run exitoso.
 */

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const INDEXES: Array<{ name: string; ddl: string }> = [
  // tasks
  {
    name: "tasks_assignee_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx ON tasks (assignee_id, status)`,
  },
  {
    name: "tasks_project_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks (project_id, status)`,
  },
  {
    name: "tasks_parent_idx",
    ddl: `CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks (parent_task_id)`,
  },
  // documents
  {
    name: "documents_project_idx",
    ddl: `CREATE INDEX IF NOT EXISTS documents_project_idx ON documents (project_id)`,
  },
  {
    name: "documents_task_idx",
    ddl: `CREATE INDEX IF NOT EXISTS documents_task_idx ON documents (task_id)`,
  },
  // notes
  {
    name: "notes_project_idx",
    ddl: `CREATE INDEX IF NOT EXISTS notes_project_idx ON notes (project_id)`,
  },
  {
    name: "notes_task_idx",
    ddl: `CREATE INDEX IF NOT EXISTS notes_task_idx ON notes (task_id)`,
  },
  // changelog
  {
    name: "changelog_project_idx",
    ddl: `CREATE INDEX IF NOT EXISTS changelog_project_idx ON changelog (project_id)`,
  },
  {
    name: "changelog_user_idx",
    ddl: `CREATE INDEX IF NOT EXISTS changelog_user_idx ON changelog (user_id)`,
  },
  // notifications (críticos — polling 30s)
  {
    name: "notifications_user_created_idx",
    ddl: `CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at)`,
  },
  {
    name: "notifications_user_unread_idx",
    ddl: `CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read_at)`,
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];

  for (const idx of INDEXES) {
    try {
      await db.execute(sql.raw(idx.ddl));
      results.push({ name: idx.name, ok: true });
    } catch (e) {
      results.push({
        name: idx.name,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    total: INDEXES.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

export async function GET() {
  return NextResponse.json({
    message: "POST a este endpoint para aplicar los índices",
    indexes: INDEXES.map((i) => i.name),
  });
}
