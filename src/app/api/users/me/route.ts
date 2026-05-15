import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name } = await request.json();
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
