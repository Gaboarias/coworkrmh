/**
 * GET /api/notifications/unread-count — count cheap para polling.
 * Devuelve { count: number }.
 */

import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getUnreadCount();
  return NextResponse.json({ count });
}
