/**
 * Middleware (Edition 04 · M2 Auth).
 *
 * - Para rutas web (no /api/*): delega a next-auth/middleware (NextAuth cookie).
 * - Para rutas /api/* (excepto /api/auth/* y /api/cron/*): permite request
 *   con Bearer JWT válido (mobile) O con NextAuth cookie (web). Si no hay
 *   ninguno y la ruta requiere auth, deja que el route handler decida (con
 *   getServerSession o nuestro helper). Esto evita doble-protección y mantiene
 *   compatibilidad con server actions invocados via fetch desde el web.
 *
 * Estrategia: el middleware NO bloquea API routes — sólo bloquea páginas
 * UI sin auth. La auth de /api/* se delega a getServerSession() o
 * verifyBearerToken() llamados desde cada route handler.
 *
 * Motivo: bloquear /api/* en middleware forzaría redirect a /login (HTML)
 * para llamadas que el mobile necesita como JSON 401. Más limpio dejar al
 * route handler retornar el status code apropiado.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

// Versión NextAuth para páginas UI (mantiene comportamiento clásico).
const nextAuthMiddleware = withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // API routes: no bloquear en middleware — el handler decide auth.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  // Páginas UI: delega a NextAuth (cookie-based).
  return nextAuthMiddleware(req as Parameters<typeof nextAuthMiddleware>[0], {} as Parameters<typeof nextAuthMiddleware>[1]);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|login|signup|reset-password).*)",
  ],
};
