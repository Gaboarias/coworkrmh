import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

/**
 * Tests de autorización de los server actions de clientes.
 *
 * Por qué importan: son `"use server"`, o sea endpoints HTTP que cualquier
 * usuario autenticado puede invocar con el id que quiera. Dos de ellos
 * (listClientProjects / listClientPayments) sólo verificaban autenticación, con
 * lo cual un `member` podía leer los proyectos y el historial de pagos de
 * cualquier cliente. El compilador no ve nada de esto.
 */

const h = vi.hoisted(() => {
  const state = {
    session: null as { user: { id: string; role: string } } | null,
    /** where capturado del último db.delete(...).where(...) */
    lastDeleteWhere: undefined as unknown,
    /** true si alguna query llegó a ejecutarse */
    dbTouched: false,
  };

  // Chain thenable: cualquier método devuelve la misma cadena, y `await`
  // resuelve a []. Alcanza para estos actions (no se testea el resultado,
  // se testea el guard).
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const m of [
      "from",
      "orderBy",
      "limit",
      "innerJoin",
      "leftJoin",
      "values",
      "set",
      "onConflictDoNothing",
      "returning",
    ]) {
      chain[m] = self;
    }
    chain.where = (w: unknown) => {
      state.lastDeleteWhere = w;
      return chain;
    };
    // thenable → `await chain` devuelve []
    chain.then = (resolve: (v: unknown[]) => unknown) => resolve([]);
    return chain;
  };

  const db = {
    select: () => {
      state.dbTouched = true;
      return makeChain();
    },
    insert: () => {
      state.dbTouched = true;
      return makeChain();
    },
    update: () => {
      state.dbTouched = true;
      return makeChain();
    },
    delete: () => {
      state.dbTouched = true;
      return makeChain();
    },
  };

  return { state, db };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/auth", () => ({ auth: async () => h.state.session }));
// guards.ts re-exporta helpers de workspace.ts, que usa React `cache()` — no
// existe fuera de un render de React. Los guards que usa clients.ts sólo miran
// la sesión, así que el módulo entero se puede stubear.
vi.mock("@/lib/workspace", () => ({
  requireProjectAccess: async () => ({ userId: "u1", workspaceId: "ws1" }),
  requireWorkspaceManage: async () => ({ userId: "u1", role: "owner" }),
  requireWorkspaceOwner: async () => ({ userId: "u1" }),
  getActiveWorkspace: async () => null,
  getWorkspacePermissions: async () => ({ permissions: new Set<string>() }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/email", () => ({
  getAppUrl: () => "https://cowork-rmh.vercel.app",
  sendPortalInviteEmail: async () => undefined,
}));

const {
  listClients,
  listClientProjects,
  listClientPayments,
  unlinkClientFromProject,
} = await import("./clients");

const asRole = (role: string | null) => {
  h.state.session = role ? { user: { id: "u1", role } } : null;
};

beforeEach(() => {
  h.state.session = null;
  h.state.lastDeleteWhere = undefined;
  h.state.dbTouched = false;
});

const READERS: Array<[string, () => Promise<unknown>]> = [
  ["listClients", () => listClients()],
  ["listClientProjects", () => listClientProjects("client-ajeno")],
  ["listClientPayments", () => listClientPayments("client-ajeno")],
];

describe("lectura de datos de cliente — autorización", () => {
  it.each(READERS)("%s rechaza a un usuario sin sesión", async (_n, call) => {
    asRole(null);
    await expect(call()).rejects.toThrow(/No autenticado/);
    expect(h.state.dbTouched).toBe(false);
  });

  // El agujero real: `member` autenticado leyendo datos de cualquier cliente.
  it.each(READERS)("%s rechaza a un member", async (_n, call) => {
    asRole("member");
    await expect(call()).rejects.toThrow(/Permisos insuficientes/);
    expect(h.state.dbTouched).toBe(false);
  });

  it.each(READERS)("%s permite a un admin", async (_n, call) => {
    asRole("admin");
    await expect(call()).resolves.toBeDefined();
  });

  it.each(READERS)("%s permite a un manager", async (_n, call) => {
    asRole("manager");
    await expect(call()).resolves.toBeDefined();
  });

  it.each(READERS)("%s rechaza un rol inventado", async (_n, call) => {
    asRole("superadmin");
    await expect(call()).rejects.toThrow(/Permisos insuficientes/);
    expect(h.state.dbTouched).toBe(false);
  });
});

describe("unlinkClientFromProject — el WHERE filtra por AMBAS columnas", () => {
  it("emite client_id AND project_id, no sólo project_id", async () => {
    asRole("admin");
    await unlinkClientFromProject("cli-1", "proj-1");

    expect(h.state.lastDeleteWhere).toBeDefined();

    // Se compila el where a SQL real en vez de inspeccionar internals de
    // drizzle: es lo que efectivamente corre contra Postgres.
    const { sql, params } = new PgDialect().sqlToQuery(
      h.state.lastDeleteWhere as never
    );

    // El bug: `eq(a) && eq(b)` evalúa a `eq(b)`, así que el WHERE quedaba
    // con project_id solo y el DELETE borraba el vínculo de TODOS los
    // clientes con ese proyecto.
    expect(sql).toContain("client_id");
    expect(sql).toContain("project_id");
    expect(sql.toLowerCase()).toContain(" and ");
    expect(params).toEqual(["cli-1", "proj-1"]);
  });

  it("no deja pasar a un no-admin", async () => {
    asRole("member");
    await expect(unlinkClientFromProject("cli-1", "proj-1")).rejects.toThrow(
      /No autorizado/
    );
    expect(h.state.dbTouched).toBe(false);
  });
});
