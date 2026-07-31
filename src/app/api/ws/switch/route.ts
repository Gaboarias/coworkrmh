import { NextResponse } from "next/server";
import { canAccessWorkspace, WS_COOKIE } from "@/lib/workspace";

// Cambia el entorno activo (cookie) y redirige. Usado por el selector y por
// el auto-switch de deep-links. Solo Route Handler puede setear cookie.
/**
 * ¿Es `next` una ruta interna segura?
 *
 * `startsWith("/")` NO alcanza: "//evil.com" también empieza con "/" y
 * `new URL("//evil.com", origin)` resuelve a "https://evil.com/" (URL
 * protocol-relative) — open redirect. Lo mismo con "/\evil.com", que algunos
 * navegadores normalizan a "//". Se resuelve contra el origin y se confirma
 * que no se haya escapado de él.
 */
function safeInternalPath(next: string, base: URL): string {
  const FALLBACK = "/dashboard";
  if (!next.startsWith("/")) return FALLBACK;
  if (next.startsWith("//") || next.startsWith("/\\")) return FALLBACK;
  try {
    const resolved = new URL(next, base);
    if (resolved.origin !== base.origin) return FALLBACK;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return FALLBACK;
  }
}

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? "";
  const next = url.searchParams.get("next") || "/dashboard";
  const safeNext = safeInternalPath(next, url);

  if (!to || !(await canAccessWorkspace(to))) {
    return NextResponse.redirect(new URL("/dashboard", url));
  }

  const res = NextResponse.redirect(new URL(safeNext, url));
  res.cookies.set(WS_COOKIE, to, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
};
