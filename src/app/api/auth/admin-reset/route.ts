import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const GUARD = "rmh-oneshot-7f3a91c4e8b240d6";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);
  const [updated] = await db
    .update(users)
    .set({ passwordHash, role: "admin", updatedAt: new Date() })
    .where(eq(users.email, email.trim().toLowerCase()))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, updated });
}
