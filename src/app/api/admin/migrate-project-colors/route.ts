/**
 * Migración temporal: actualiza el color de proyectos específicos al
 * mapeo Edition 04 indicado por el usuario.
 *
 * Auth: requiere session.user.role === 'admin'.
 * Token guard: requiere header x-migration-token === MIGRATION_TOKEN
 *              (definido inline para que sea single-use).
 *
 * Uso:
 *   curl -X POST https://<host>/api/admin/migrate-project-colors \
 *        -H "x-migration-token: edition04-colors-9b3a"
 *        --cookie "next-auth.session-token=..."
 *
 * Después de correrlo exitosamente, ELIMINAR esta ruta (no debe quedar
 * un endpoint que muta DB con guard débil).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { ilike, eq } from "drizzle-orm";

const MIGRATION_TOKEN = "edition04-colors-9b3a";

// Mapeo nombre (parcial, case-insensitive) → color Edition 04
const COLOR_MAP: Array<{ matchName: string; color: string; label: string }> = [
  { matchName: "aliaga", color: "#d63a1f", label: "vermillion" },
  { matchName: "ronda", color: "#1f7a4d", label: "emerald" },
  { matchName: "pampita", color: "#e89a0d", label: "saffron" },
  { matchName: "spring", color: "#2e52d9", label: "cobalt" },
];

export async function POST(request: Request) {
  // Guard 1: token header
  const token = request.headers.get("x-migration-token");
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Invalid migration token" }, { status: 401 });
  }

  // Guard 2: admin role
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const results: Array<{
    matchName: string;
    label: string;
    color: string;
    updatedCount: number;
    rows: { id: string; name: string }[];
  }> = [];

  for (const entry of COLOR_MAP) {
    // ilike es case-insensitive partial match: '%aliaga%'
    const rows = await db
      .update(projects)
      .set({ color: entry.color })
      .where(ilike(projects.name, `%${entry.matchName}%`))
      .returning({ id: projects.id, name: projects.name });

    results.push({
      matchName: entry.matchName,
      label: entry.label,
      color: entry.color,
      updatedCount: rows.length,
      rows,
    });
  }

  return NextResponse.json({
    ok: true,
    summary: results,
    totalUpdated: results.reduce((s, r) => s + r.updatedCount, 0),
  });
}

// GET para preview — muestra qué proyectos coincidirían sin escribir nada
export async function GET(request: Request) {
  const token = request.headers.get("x-migration-token");
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Invalid migration token" }, { status: 401 });
  }
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const preview: Array<{
    matchName: string;
    color: string;
    label: string;
    matches: { id: string; name: string; currentColor: string | null }[];
  }> = [];

  for (const entry of COLOR_MAP) {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        currentColor: projects.color,
      })
      .from(projects)
      .where(ilike(projects.name, `%${entry.matchName}%`));

    preview.push({
      matchName: entry.matchName,
      color: entry.color,
      label: entry.label,
      matches: rows,
    });
  }

  return NextResponse.json({ ok: true, preview, willUpdate: preview.reduce((s, p) => s + p.matches.length, 0) });
}
