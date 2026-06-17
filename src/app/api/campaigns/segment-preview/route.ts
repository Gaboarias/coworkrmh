import { NextRequest, NextResponse } from "next/server";
import {
  countSegment,
  resolveSegment,
  type SegmentFilter,
} from "@/lib/marketing/segment";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";

/**
 * POST /api/campaigns/segment-preview  (admin)
 * body: SegmentFilter
 * Devuelve cuántos califican + una muestra de 5 para el builder. No encola nada.
 */
export async function POST(req: NextRequest) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const filter = (await req.json().catch(() => ({}))) as SegmentFilter;

  const total = await countSegment(filter);
  const sample =
    total > 0
      ? (await resolveSegment(filter)).slice(0, 5).map((r) => ({
          email: r.email,
          nombre: r.mergeData.nombre,
          empresa: r.mergeData.empresa,
        }))
      : [];

  return NextResponse.json({ total, sample });
}
