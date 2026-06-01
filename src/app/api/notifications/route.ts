/**
 * GET /api/notifications — lista notificaciones del usuario + unread count.
 *
 * Auth: NextAuth cookie (web) o Bearer JWT (mobile, agregado en M2).
 * Por ahora sólo cookie — mobile lo va a poder consumir cuando merge Track B.
 */

import { NextResponse } from "next/server";
import { listMyNotifications } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listMyNotifications();
  return NextResponse.json(data);
}
