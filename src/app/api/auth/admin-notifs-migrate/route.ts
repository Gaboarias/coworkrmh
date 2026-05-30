import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// TEMP guarded — N4: crea tabla notifications + enum notification_type.
// Borrar tras aplicar.
const GUARD = "rmh-notifs-9a2f4c1e3d";

function rows(r: unknown): unknown[] {
  const x = r as { rows?: unknown[] };
  return Array.isArray(x?.rows) ? x.rows : Array.isArray(r) ? (r as unknown[]) : [];
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Enum (idempotente)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "notification_type" AS ENUM (
        'task_assigned',
        'task_due_soon',
        'task_status_changed',
        'note_mentioned',
        'project_member_added',
        'workspace_member_added',
        'comment_reply'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Tabla (idempotente)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type notification_type NOT NULL,
      payload jsonb NOT NULL,
      href text,
      read_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  // Índices útiles
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON notifications (user_id, read_at)
    WHERE read_at IS NULL
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications (user_id, created_at DESC)
  `);

  const stats = rows(
    await db.execute(sql`
      SELECT count(*)::int AS total FROM notifications
    `)
  );
  return NextResponse.json({ ok: true, stats });
}
