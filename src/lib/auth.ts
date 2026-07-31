import { NextAuthOptions, getServerSession, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/auth-bearer";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  registerFailure,
  clearRateLimit,
} from "@/lib/rate-limit";

/**
 * Hash bcrypt cost 12 de un valor descartable. Se compara contra él cuando el
 * email NO existe, para que un login fallido tarde lo mismo exista o no el
 * usuario. Sin esto, el early-return delata qué emails están registrados
 * (el caso "existe" paga ~100 ms de bcrypt y el caso "no existe" no paga nada).
 */
const DUMMY_HASH =
  "$2b$12$pBm9tIQH911kMSxDF0p1juezl7M3kgJTGO0B20NRpBSVSPYAbzBPS";

/** Rate limit del login web. Mismos números que /api/auth/mobile-token. */
const LOGIN_RL = { maxAttempts: 5, windowMinutes: 15, lockMinutes: 15 };

/**
 * Cada cuánto se revalida el rol contra la DB dentro del callback `jwt`.
 *
 * El rol viaja en el JWT, así que sin esto un cambio de rol no surtía efecto
 * hasta que expirara la sesión (30 días). Con 60 s el peor caso es una query
 * por usuario por minuto — despreciable al lado del polling que ya se recortó,
 * y acota la ventana de un admin degradado a un minuto.
 */
const ROLE_TTL_MS = 60_000;

/** IP del request actual (para rate-limitear por origen además de por email). */
function currentIp(): string {
  try {
    const h = headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

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
        const ip = currentIp();
        const emailKey = `login:${email}`;
        const ipKey = `login-ip:${ip}`;

        try {
          // Rate limit ANTES de tocar la DB o bcrypt. Se limita por email y
          // por IP: lo primero frena el ataque dirigido a una cuenta, lo
          // segundo el barrido de muchas cuentas desde un mismo origen.
          for (const key of [emailKey, ipKey]) {
            const guard = await checkRateLimit(key, LOGIN_RL);
            if (!guard.allowed) {
              throw new Error(guard.message ?? "Demasiados intentos.");
            }
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          // Comparar siempre, aunque no exista el usuario: iguala el tiempo
          // de respuesta y evita la enumeración de emails.
          const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
          const valid = await compare(credentials.password, hashToCheck);

          if (!user || !user.passwordHash || !valid) {
            await registerFailure(emailKey, LOGIN_RL);
            await registerFailure(ipKey, LOGIN_RL);
            return null;
          }

          // Login OK → se limpian ambos contadores.
          await clearRateLimit(emailKey);
          await clearRateLimit(ipKey);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl,
            role: user.role,
          };
        } catch (err) {
          // Los errores de rate limit son mensajes para el usuario, no fallos:
          // se propagan tal cual para que el login los muestre.
          if (err instanceof Error && err.message.startsWith("Demasiados")) {
            throw err;
          }
          logger.error("[AUTH] authorize error", err);
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * El rol NO puede quedar congelado en el token: `session.user.role ===
     * "admin"` se traduce en bypass total de permisos en todos los entornos
     * (ver getWorkspaceRole en lib/workspace.ts). Si sólo se escribiera en el
     * login, degradar a un admin no tendría efecto hasta que expirara su
     * sesión — 30 días. Por eso se revalida contra la DB cada ROLE_TTL_MS.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "member";
        token.roleCheckedAt = Date.now();
        return token;
      }

      if (!token.id) return token;

      const checkedAt = token.roleCheckedAt ?? 0;
      if (Date.now() - checkedAt < ROLE_TTL_MS) return token;

      try {
        const [row] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (!row) {
          // Usuario borrado → sesión inválida (auth() la rechaza).
          token.invalid = true;
        } else {
          token.role = row.role;
        }
        token.roleCheckedAt = Date.now();
      } catch (err) {
        // Si la DB falla no se cierra la sesión, pero tampoco se refresca el
        // timestamp: se reintenta en el request siguiente.
        logger.error("[AUTH] no se pudo revalidar el rol", err);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Token marcado inválido (usuario borrado) → id vacío, que es lo que
        // auth() usa para descartar la sesión.
        session.user.id = token.invalid ? "" : ((token.id ?? "") as string);
        session.user.role = token.invalid
          ? "member"
          : ((token.role ?? "member") as string);
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
  // El callback `session` no puede devolver null, así que un usuario borrado
  // se marca en el token y se filtra acá.
  if (session && !session.user?.id) return null;
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
