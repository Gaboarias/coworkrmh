import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { googleConfigured, exchangeGoogleCode } from "@/lib/calendar/google";
import { encryptToken } from "@/lib/calendar/crypto";
import { getAppUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Callback OAuth de Google: intercambia el code y guarda tokens cifrados. */
export async function GET(request: Request) {
  const base = getAppUrl();
  const url = new URL(request.url);
  const session = await auth();
  if (!session) return NextResponse.redirect(`${base}/login`);
  if (!googleConfigured()) {
    return NextResponse.redirect(`${base}/settings?calendar=unconfigured`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = cookies();
  const cookieState = jar.get("cal_oauth_state")?.value;
  jar.delete("cal_oauth_state");

  if (
    url.searchParams.get("error") ||
    !code ||
    !state ||
    !cookieState ||
    state !== cookieState
  ) {
    return NextResponse.redirect(`${base}/settings?calendar=error`);
  }

  try {
    const t = await exchangeGoogleCode(code);
    // Sin refresh token no podemos mantener el acceso → tratamos como error.
    if (!t.refreshToken) {
      return NextResponse.redirect(`${base}/settings?calendar=error`);
    }

    const userId = session.user.id;
    const values = {
      provider: "google" as const,
      accountEmail: t.email,
      accessToken: encryptToken(t.accessToken),
      refreshToken: encryptToken(t.refreshToken),
      expiresAt: new Date(Date.now() + t.expiresIn * 1000),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: calendarConnections.id })
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, "google")
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(calendarConnections)
        .set(values)
        .where(eq(calendarConnections.id, existing.id));
    } else {
      await db.insert(calendarConnections).values({ userId, ...values });
    }

    return NextResponse.redirect(`${base}/settings?calendar=connected`);
  } catch {
    return NextResponse.redirect(`${base}/settings?calendar=error`);
  }
}
