import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/middleware";
import { workspaceInvitations } from "@/lib/db/schema";
import {
  INVITE_TTL_DAYS,
  INVITE_TTL_OPTIONS,
  DEFAULT_INVITE_TTL_DAYS,
} from "@/lib/constants/invites";

/**
 * Invitaciones a un entorno.
 *
 * Lo que se fija acá no es "que funcione" — eso lo dice el navegador. Es el
 * puñado de decisiones que, si alguien las revierte sin querer, no rompen
 * nada visible y dejan un agujero: que el token no se guarde en claro, que
 * siempre haya vencimiento, que la ruta sea pública pero aceptar no lo sea, y
 * que el cupo se reserve de forma atómica.
 */

const SRC = path.resolve(__dirname, "..");
const ACTIONS = fs.readFileSync(
  path.join(SRC, "lib", "actions", "invitations.ts"),
  "utf8"
);

const matcher = (config.matcher as string[])[0];
const isGuarded = (pathname: string) => new RegExp(`^${matcher}$`).test(pathname);

describe("el token nunca se guarda en claro", () => {
  it("la tabla tiene token_hash y NO una columna de token", () => {
    const columnas = Object.keys(workspaceInvitations);
    expect(columnas).toContain("tokenHash");
    // Si aparece un `token` suelto, alguien guardó el valor canjeable: quien
    // lea la base —un backup, un dump, un select en soporte— entra a
    // cualquier entorno sin credenciales.
    expect(
      columnas.filter((c) => /^token$/i.test(c)),
      "workspace_invitations no debe tener una columna `token` — sólo el hash"
    ).toEqual([]);
  });

  it("el action hashea antes de escribir y antes de buscar", () => {
    expect(ACTIONS).toContain("tokenHash: hashToken(");
    // Buscar por token en claro implicaría haberlo guardado en claro.
    expect(ACTIONS).toMatch(/tokenHash,\s*hashToken\(/);
  });

  it("el link en claro sólo sale de createWorkspaceInvite", () => {
    // listWorkspaceInvites devuelve url: null a propósito. Si algún día
    // devolviera el link, sería porque se guardó el token.
    expect(ACTIONS).toContain("url: null");
  });
});

describe("toda invitación vence", () => {
  it("no hay opción de vencimiento infinito", () => {
    expect(INVITE_TTL_DAYS.length).toBeGreaterThan(0);
    for (const d of INVITE_TTL_DAYS) {
      expect(d).toBeGreaterThan(0);
      expect(Number.isFinite(d)).toBe(true);
      // 90 días ya es demasiado para un link a Operaciones.
      expect(d).toBeLessThanOrEqual(30);
    }
  });

  it("expiresAt es NOT NULL en el schema", () => {
    // Nullable querría decir "puede no vencer", que es justo lo que este
    // diseño evita frente a clients.portal_token.
    expect(workspaceInvitations.expiresAt.notNull).toBe(true);
  });

  it("el default está entre las opciones que ofrece la UI", () => {
    // Si el default cae fuera de la lista, el <Select> arranca sin ninguna
    // opción marcada y el navegador elige la primera en silencio.
    expect(INVITE_TTL_DAYS).toContain(DEFAULT_INVITE_TTL_DAYS);
  });

  it("las opciones de la UI son las mismas que valida el servidor", () => {
    // Una fuente sola: agregar una opción a la lista la habilita en los dos
    // lados a la vez. Antes de esto, un valor nuevo en el <Select> caía en
    // silencio al default del servidor.
    expect(INVITE_TTL_OPTIONS.map((o) => o.days)).toEqual([
      ...INVITE_TTL_DAYS,
    ]);
  });
});

describe("la ruta /invite es pública, aceptar no", () => {
  it("el middleware no protege /invite/<token>", () => {
    // Quien recibe la invitación puede no tener cuenta: si esto vuelve a ser
    // privado, el link redirige a /login sin decir a qué te invitaban, y
    // parece un link roto.
    expect(isGuarded("/invite/abc123")).toBe(false);
  });

  it("el middleware sigue protegiendo la app", () => {
    for (const p of ["/dashboard", "/settings", "/admin", "/operations"]) {
      expect(isGuarded(p), `${p} debería requerir auth`).toBe(true);
    }
  });

  it("aceptar exige sesión aunque la pantalla sea pública", () => {
    const accept = ACTIONS.slice(ACTIONS.indexOf("export async function acceptInvite"));
    expect(
      /requireUser\s*\(/.test(accept),
      "acceptInvite sin requireUser dejaría entrar a un anónimo a un entorno"
    ).toBe(true);
  });

  it("la pantalla existe donde el link la busca", () => {
    expect(
      fs.existsSync(
        path.join(SRC, "app", "(auth)", "invite", "[token]", "page.tsx")
      )
    ).toBe(true);
    expect(ACTIONS).toContain("/invite/${");
  });
});

describe("el cupo se reserva de forma atómica", () => {
  it("el conteo de usos sube dentro del WHERE que valida vigencia", () => {
    const accept = ACTIONS.slice(ACTIONS.indexOf("export async function acceptInvite"));
    // Leer used_count y después escribirlo deja pasar dos aceptaciones
    // simultáneas por el mismo último uso: ambas leen maxUses - 1. Tiene que
    // ser un solo UPDATE ... WHERE ... RETURNING.
    expect(accept).toContain("usedCount: sql`");
    expect(accept).toMatch(/usedCount}\s*<\s*\$\{[^}]*maxUses}/);
    expect(
      accept.includes(".returning("),
      "sin RETURNING no se sabe si el UPDATE agarró alguna fila, y el cupo deja de ser un cupo"
    ).toBe(true);
  });

  it("no degrada a quien ya es miembro", () => {
    const accept = ACTIONS.slice(ACTIONS.indexOf("export async function acceptInvite"));
    // Un link abierto con rol "member" abierto por un admin del entorno no
    // puede bajarle el rol. La salida temprana es lo que lo garantiza.
    expect(accept).toContain("alreadyMember: true");
    expect(accept).toContain("onConflictDoNothing");
  });
});
