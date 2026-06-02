import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { signupBodySchema, parseBody } from "@/lib/validation/auth";
import {
  checkRateLimit,
  registerFailure,
  clientIp,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limit: 5 signups por IP por hora (abuso de la flow).
  const ip = clientIp(req);
  const rlKey = `signup:${ip}`;
  const guard = await checkRateLimit(rlKey, { maxAttempts: 5, windowMinutes: 60, lockMinutes: 60 });
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.message ?? "Demasiados intentos" },
      { status: 429 }
    );
  }

  const parsed = await parseBody(req, signupBodySchema);
  if (!parsed.ok) return parsed.response;
  const { email, password, name } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      await registerFailure(rlKey, { maxAttempts: 5, windowMinutes: 60, lockMinutes: 60 });
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    // First user ever becomes admin
    const [{ total }] = await db.select({ total: count() }).from(users);
    const role = total === 0 ? "admin" : "member";

    const [user] = await db
      .insert(users)
      .values({ email, name: name ?? null, passwordHash, role })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    // No loguear `err` con stack — puede contener PII / fragmentos del input.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
