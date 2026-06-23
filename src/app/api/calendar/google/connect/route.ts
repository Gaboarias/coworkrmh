import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { googleConfigured, getGoogleAuthUrl } from "@/lib/calendar/google";
import { getAppUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicia el flujo OAuth de Google Calendar (read-only). */
export async function GET() {
  const base = getAppUrl();
  const session = await auth();
  if (!session) return NextResponse.redirect(`${base}/login`);
  if (!googleConfigured()) {
    return NextResponse.redirect(`${base}/settings?calendar=unconfigured`);
  }

  // CSRF: state random guardado en cookie httpOnly, verificado en el callback.
  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("cal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
