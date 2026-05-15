import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    // First user ever becomes admin
    const [{ total }] = await db.select({ total: count() }).from(users);
    const role = total === 0 ? "admin" : "member";

    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), name: name ?? null, passwordHash, role })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
