/**
 * Debug probe — intenta crear un workspace y devuelve el ERROR completo al
 * cliente si falla (los Server Actions enmascaran la error real con un
 * mensaje genérico tipo 'Application error').
 *
 * POST /api/admin/debug/probe-create-workspace
 *   body opcional: { name?: string, color?: string }
 *
 * Auth: admin role. Borrar después de diagnosticar.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { name?: unknown; color?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // body vacío OK
  }

  const name =
    (typeof body.name === "string" && body.name.trim()) ||
    `Probe ${new Date().toISOString().slice(0, 19)}`;
  const color =
    (typeof body.color === "string" && body.color) || "#6B5FE4";

  const trace: Array<{ step: string; ok: boolean; detail?: unknown }> = [];

  // Step 1: INSERT workspaces
  let workspaceId: string;
  try {
    const [ws] = await db
      .insert(workspaces)
      .values({ name, color, createdBy: session.user.id })
      .returning();
    workspaceId = ws.id;
    trace.push({ step: "insert_workspaces", ok: true, detail: { id: ws.id } });
  } catch (err) {
    trace.push({
      step: "insert_workspaces",
      ok: false,
      detail: {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
      },
    });
    return NextResponse.json({ ok: false, trace }, { status: 500 });
  }

  // Step 2: INSERT workspaceMembers
  try {
    await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: session.user.id,
        role: "owner",
      })
      .onConflictDoNothing();
    trace.push({ step: "insert_workspace_members", ok: true });
  } catch (err) {
    trace.push({
      step: "insert_workspace_members",
      ok: false,
      detail: {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
      },
    });
    return NextResponse.json({ ok: false, trace, workspaceId }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    trace,
    workspaceId,
    message:
      "Workspace 'probe' creado OK. Aparece en /admin — borralo manualmente desde el panel.",
  });
}
