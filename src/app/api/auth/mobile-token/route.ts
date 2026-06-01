/**
 * POST /api/auth/mobile-token — login para mobile app.
 *
 * Body: { email: string, password: string }
 * Response 200: { token: string, user: { id, email, name, role, image } }
 * Response 400: { error: "Email y contraseña son requeridos" }
 * Response 401: { error: "Credenciales inválidas" }
 *
 * Valida con bcrypt contra users.passwordHash, mismo flujo que el
 * CredentialsProvider de NextAuth (src/lib/auth.ts). Si OK, firma JWT
 * con NEXTAUTH_SECRET (HS256), TTL 30 días.
 *
 * Mobile guarda el token en expo-secure-store y lo envía como
 * `Authorization: Bearer <token>` en cada API call.
 */

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signMobileToken } from "@/lib/auth-bearer";

export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const token = await signMobileToken({
    sub: user.id,
    email: user.email ?? "",
    name: user.name ?? null,
    role: user.role ?? "member",
    image: user.avatarUrl ?? null,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.avatarUrl,
    },
  });
}
