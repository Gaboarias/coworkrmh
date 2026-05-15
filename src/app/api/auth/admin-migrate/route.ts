import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const GUARD = "rmh-migrate-9b2e44f1c7a8";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  const check = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'password_reset_tokens' ORDER BY ordinal_position
  `);

  return NextResponse.json({ ok: true, columns: check.rows ?? check });
}
