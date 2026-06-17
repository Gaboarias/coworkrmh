import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { requireEmailRole, emailAuthResponse } from "@/lib/marketing/auth";
import { DEFAULT_BUCKET, DEFAULT_FROM_NAME } from "@/lib/marketing/constants";

// GET /api/campaigns?bucket=RMH  → lista (admin)
export async function GET(req: NextRequest) {
  try {
    await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }
  const bucket = new URL(req.url).searchParams.get("bucket");
  const rows = bucket
    ? await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.bucketId, bucket))
        .orderBy(desc(campaigns.createdAt))
    : await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(255),
  subject: z.string().trim().min(1, "Asunto requerido").max(500),
  fromName: z.string().trim().max(255).optional(),
  fromEmail: z.string().trim().email("From email inválido").max(254),
  replyTo: z.string().trim().email("Reply-to inválido").max(254).optional().nullable(),
  html: z.string().min(1, "HTML requerido").max(200_000),
  bucketId: z.string().trim().max(64).optional(),
  segmentQuery: z.unknown().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// POST /api/campaigns  → crea draft (admin)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireEmailRole();
  } catch (err) {
    return emailAuthResponse(err);
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const b = parsed.data;

  const [row] = await db
    .insert(campaigns)
    .values({
      bucketId: b.bucketId ?? DEFAULT_BUCKET,
      name: b.name,
      subject: b.subject,
      fromName: b.fromName ?? DEFAULT_FROM_NAME,
      fromEmail: b.fromEmail,
      replyTo: b.replyTo ?? null,
      html: b.html,
      segmentQuery: (b.segmentQuery ?? null) as object | null,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
      createdBy: user.id,
      status: "draft",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
