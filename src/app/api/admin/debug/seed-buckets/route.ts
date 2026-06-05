/**
 * One-shot — crear las 6 categorías (buckets) del pipeline RMH.
 *
 * POST /api/admin/debug/seed-buckets
 *
 * Idempotente:
 *  - Si una categoría con el mismo nombre ya existe, NO la duplica.
 *  - Devuelve el id de cada bucket (creado o existente).
 *
 * Categorías:
 *   1. Prospecto       (gris)
 *   2. Primer Contrato (azul)
 *   3. Firmado         (naranja)
 *   4. Operaciones     (verde)
 *   5. Retomar         (gris suave)
 *   6. Descartado      (rojo)
 *
 * Auth: admin role. Borrar después del run.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buckets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const SEEDS = [
  { name: "Prospecto", color: "#9b9890", position: 10 },
  { name: "Primer Contrato", color: "#3b6dba", position: 20 },
  { name: "Firmado", color: "#d39c2f", position: 30 },
  { name: "Operaciones", color: "#3a8a52", position: 40 },
  { name: "Retomar", color: "#c0bcb1", position: 50 },
  { name: "Descartado", color: "#c64a3a", position: 60 },
];

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: Array<{
    name: string;
    id: string;
    action: "created" | "existing";
  }> = [];

  for (const seed of SEEDS) {
    // Buscar por nombre exacto.
    const [existing] = await db
      .select({ id: buckets.id })
      .from(buckets)
      .where(eq(buckets.name, seed.name))
      .limit(1);

    if (existing) {
      results.push({ name: seed.name, id: existing.id, action: "existing" });
      continue;
    }

    const [created] = await db
      .insert(buckets)
      .values({
        name: seed.name,
        color: seed.color,
        position: seed.position,
        createdBy: session.user.id,
      })
      .returning({ id: buckets.id });

    results.push({ name: seed.name, id: created.id, action: "created" });
  }

  return NextResponse.json({
    ok: true,
    created: results.filter((r) => r.action === "created").length,
    existing: results.filter((r) => r.action === "existing").length,
    buckets: results,
  });
}
