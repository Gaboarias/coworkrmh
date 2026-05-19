import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db/schema";
import {
  ALL_WS_PERMISSIONS,
  DEFAULT_WS_ROLE_PERMISSIONS,
} from "@/lib/constants/workspacePermissions";

// TEMP guarded — e2e Fase 2 (matriz de permisos por entorno). Borrar tras usar.
const GUARD = "rmh-e2eperms-9a3f15c7e2";

type WsRole = "owner" | "admin" | "member";

// Réplica de la resolución pura de lib/workspace.ts (sin sesión, sobre DB real).
const resolve = (
  role: WsRole,
  rp: { admin: string[]; member: string[] }
): Set<string> => {
  if (role === "owner") return new Set(ALL_WS_PERMISSIONS);
  return new Set(role === "admin" ? rp.admin : rp.member);
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const add = (name: string, ok: boolean, detail = "") =>
    checks.push({ name, ok, detail });
  const wsIds: string[] = [];

  try {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .orderBy(users.createdAt)
      .limit(1);
    add("user-exists", !!u, u?.id ?? "no users");
    if (!u) throw new Error("no users");

    // 1. Crear entorno → la columna debe traer el default por DDL.
    const [wsA] = await db
      .insert(workspaces)
      .values({ name: `E2EP_A_${Date.now()}`, color: "#3f6e1f", createdBy: u.id })
      .returning();
    wsIds.push(wsA.id);
    const defA = wsA.rolePermissions;
    add(
      "default-admin-all",
      Array.isArray(defA?.admin) &&
        defA.admin.length === ALL_WS_PERMISSIONS.length,
      `admin=${defA?.admin?.length}`
    );
    add(
      "default-member-views",
      Array.isArray(defA?.member) &&
        defA.member.every((k) => k.endsWith(".view")) &&
        defA.member.includes("quotes.view"),
      `member=${JSON.stringify(defA?.member)}`
    );

    // 2. Editar matriz: quitar quotes.manage al member (conserva quotes.view).
    const customMember = DEFAULT_WS_ROLE_PERMISSIONS.member.filter(
      (k) => k !== "quotes.manage"
    );
    await db
      .update(workspaces)
      .set({
        rolePermissions: {
          admin: DEFAULT_WS_ROLE_PERMISSIONS.admin,
          member: customMember,
        },
      })
      .where(eq(workspaces.id, wsA.id));
    const [reread] = await db
      .select({ rp: workspaces.rolePermissions })
      .from(workspaces)
      .where(eq(workspaces.id, wsA.id))
      .limit(1);
    add(
      "matrix-persist",
      !reread.rp.member.includes("quotes.manage") &&
        reread.rp.member.includes("quotes.view"),
      JSON.stringify(reread.rp.member)
    );

    // 3. Resolución por rol contra la matriz guardada.
    const rp = reread.rp;
    add(
      "owner-bypass-all",
      resolve("owner", rp).has("quotes.manage") &&
        resolve("owner", rp).has("settings.manage"),
      "owner ⇒ ALL"
    );
    add(
      "admin-has-manage",
      resolve("admin", rp).has("quotes.manage") &&
        resolve("admin", rp).has("catalog.manage"),
      "admin ⇒ rp.admin"
    );
    const memberSet = resolve("member", rp);
    add(
      "member-denied-quotes-manage",
      !memberSet.has("quotes.manage"),
      "member sin quotes.manage"
    );
    add(
      "member-allowed-quotes-view",
      memberSet.has("quotes.view"),
      "member con quotes.view"
    );
    add(
      "member-denied-catalog-manage",
      !memberSet.has("catalog.manage") && memberSet.has("catalog.view"),
      "member solo lectura catálogo"
    );

    // 4. Aislamiento entre entornos: B mantiene su propio default.
    const [wsB] = await db
      .insert(workspaces)
      .values({ name: `E2EP_B_${Date.now()}`, color: "#5E8A2A", createdBy: u.id })
      .returning();
    wsIds.push(wsB.id);
    // B conserva el default intacto, independiente de la edición hecha en A.
    add(
      "isolation-independent",
      !wsB.rolePermissions.member.includes("quotes.manage") &&
        wsB.rolePermissions.admin.length === ALL_WS_PERMISSIONS.length &&
        wsB.rolePermissions.member.includes("quotes.view"),
      "B default intacto pese a edición en A"
    );

    // 5. Membresía con rol + cascade al borrar el entorno.
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: wsA.id, userId: u.id, role: "member" })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: "member" },
      });
    const memBefore = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, wsA.id));
    add("member-row", memBefore.length === 1, `n=${memBefore.length}`);

    await db.delete(workspaces).where(inArray(workspaces.id, wsIds));
    const memAfter = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, wsA.id));
    add(
      "cascade-cleanup",
      memAfter.length === 0,
      `members tras delete=${memAfter.length}`
    );
    wsIds.length = 0;

    const passed = checks.filter((c) => c.ok).length;
    return NextResponse.json({
      ok: checks.every((c) => c.ok),
      passed,
      total: checks.length,
      checks,
    });
  } catch (e) {
    if (wsIds.length) {
      await db
        .delete(workspaces)
        .where(inArray(workspaces.id, wsIds))
        .catch(() => {});
    }
    return NextResponse.json(
      { ok: false, error: (e as Error).message, checks },
      { status: 500 }
    );
  }
}
