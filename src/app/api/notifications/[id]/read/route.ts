/**
 * POST /api/notifications/[id]/read — marca una notificación como leída.
 */

import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await markNotificationRead(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 401 }
    );
  }
}
