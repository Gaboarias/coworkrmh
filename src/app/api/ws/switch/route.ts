import { NextResponse } from "next/server";
import { canAccessWorkspace, WS_COOKIE } from "@/lib/workspace";
import { safeInternalPath } from "@/lib/utils/url";

// Cambia el entorno activo (cookie) y redirige. Usado por el selector y por
// el auto-switch de deep-links. Solo Route Handler puede setear cookie.
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? "";
  const safeNext = safeInternalPath(url.searchParams.get("next"), url);

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
