/**
 * POST /api/notifications/read-all — marca todas las notificaciones del
 * usuario como leídas (bulk).
 */

import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 401 }
    );
  }
}
