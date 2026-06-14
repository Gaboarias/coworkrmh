import { NextAuthOptions, getServerSession, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/auth-bearer";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();

        try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        };
        } catch (err) {
          console.error("[AUTH] authorize error:", err);
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? "") as string;
        session.user.role = (token.role ?? "member") as string;
      }
      return session;
    },
  },
};

/**
 * auth() — resuelve la sesión actual desde DOS fuentes:
 *
 * 1. NextAuth cookie (web) — getServerSession(authOptions)
 * 2. Bearer JWT (mobile) — verifyBearerToken del Authorization header
 *
 * Si una falla, prueba la otra. Si ambas fallan, retorna null.
 * Esto permite que TODOS los server actions/routes existentes (que llaman
 * auth() esperando Session) funcionen igual cuando los invoca mobile via
 * Bearer auth.
 *
 * Async — headers() lo es a partir de Next 15. Acá usamos sync headers
 * (Next 14 compat) — si migran a 15+ envolver con `await`.
 */
export async function auth(): Promise<Session | null> {
  // 1. Probar cookie NextAuth (path rápido para web)
  const session = await getServerSession(authOptions);
  if (session) return session;

  // 2. Fallback: Bearer JWT desde header (mobile)
  let authHeader: string | null = null;
  try {
    authHeader = headers().get("authorization");
  } catch {
    // headers() puede tirar fuera de request context (build time, etc).
    return null;
  }
  if (!authHeader) return null;

  const decoded = await verifyBearerToken(authHeader);
  if (!decoded) return null;

  // Adaptar el JWT decoded al shape de Session que el resto del código espera.
  const fakeSession: Session = {
    user: {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      image: decoded.image,
      role: decoded.role,
    },
    expires: new Date(decoded.exp * 1000).toISOString(),
  };
  return fakeSession;
}
