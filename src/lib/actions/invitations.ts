"use server";

/**
 * Invitaciones a un entorno.
 *
 * Dos formas, una sola mecánica (ver el comentario de `workspace_invitations`
 * en schema.ts):
 *  - dirigida: se fija un correo y sólo esa cuenta la canjea.
 *  - link abierto: sin correo, entra cualquiera que tenga el link, con el rol
 *    y el vencimiento que se fijaron al crearlo.
 *
 * Quién puede invitar: cualquiera con `members.manage` en ESE entorno, no sólo
 * el admin global. Ese es el punto — hasta ahora crear un usuario era
 * POST /api/users, que exige rol admin global, así que el dueño de un entorno
 * tenía que pedirle a otra persona que sumara a alguien a su propio equipo.
 *
 * Lo que esto NO es: una llave. El portal del cliente (clients.portal_token)
 * sirve para siempre y sin cuenta porque expone contenido curado y de sólo
 * lectura. Un entorno tiene Operaciones adentro — ventas, gastos, márgenes,
 * planilla. Un link permanente a eso, reenviado a un grupo, sería un agujero.
 * Por eso: vence siempre, se puede revocar, se puede limitar los usos, y del
 * otro lado siempre queda una cuenta con nombre y correo.
 */

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces,
  users,
} from "@/lib/db/schema";
import { requireUser, requireWorkspaceManage } from "./guards";
import { assertAssignableRole } from "@/lib/workspace";
import { newToken, hashToken } from "@/lib/utils/token";
import { getAppUrl, sendWorkspaceInviteEmail } from "@/lib/email";
import { createNotification } from "@/lib/actions/notifications";
import { logger } from "@/lib/logger";
import {
  INVITE_TTL_DAYS,
  DEFAULT_INVITE_TTL_DAYS,
} from "@/lib/constants/invites";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InviteRow {
  id: string;
  email: string | null;
  role: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  revokedAt: string | null;
  createdAt: string;
  createdByName: string | null;
  url: null;
}

/**
 * Estado de una invitación mirada desde afuera, sin sesión.
 *
 * Un miembro por estado y no `"expired" | "revoked" | "exhausted"` juntos:
 * con los tres en un solo miembro, TypeScript narrow-ea la propiedad pero no
 * descarta el miembro, así que después de los tres `if` la pantalla seguía
 * sin ver los campos del caso bueno.
 */
export type InvitePreview =
  | { status: "invalid" }
  | { status: "expired"; workspaceName: string }
  | { status: "revoked"; workspaceName: string }
  | { status: "exhausted"; workspaceName: string }
  | {
      status: "ok";
      workspaceName: string;
      workspaceColor: string;
      role: string;
      invitedByName: string | null;
      /** Enmascarado: el link puede haberse reenviado. */
      emailHint: string | null;
      expiresAt: string;
    };

const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

/**
 * `gabriel@gmail.com` → `ga***@gmail.com`.
 *
 * Alcanza para saber con qué cuenta entrar y no confirma la dirección entera a
 * quien recibió el link de rebote.
 */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "***" : ""}@${domain}`;
};

const inviteUrlFor = (rawToken: string): string =>
  `${getAppUrl()}/invite/${rawToken}`;

// ─── Crear ────────────────────────────────────────────────────────────────────

/**
 * Crea una invitación y devuelve el link EN CLARO.
 *
 * Es la única vez que el token existe fuera del hash: no se puede volver a
 * mostrar después, igual que en cualquier gestor de tokens serio. Si se
 * perdió, se revoca y se crea otro.
 */
export async function createWorkspaceInvite(
  workspaceId: string,
  opts: {
    /** null/vacío = link abierto. */
    email?: string | null;
    role?: string;
    expiresInDays?: number;
    /** null = sin tope hasta que venza. */
    maxUses?: number | null;
    /** Sólo aplica a invitaciones dirigidas. */
    sendEmail?: boolean;
  } = {}
): Promise<{ id: string; url: string; emailSent: boolean }> {
  const actor = await requireWorkspaceManage(workspaceId);

  const role = opts.role?.trim() || "member";
  // Rechaza "owner" y roles que no existen en la matriz del entorno. Sin esto
  // se podría invitar a un rol inventado y la persona entraría sin permisos.
  await assertAssignableRole(workspaceId, role);

  const email = opts.email?.trim() ? normalizeEmail(opts.email) : null;
  if (email && !email.includes("@")) {
    throw new Error("Correo inválido");
  }

  // Un TTL que no está en la lista cae al default en vez de aceptarse: el
  // parámetro llega desde el cliente y "365" no debería ser un valor válido
  // sólo porque alguien lo escribió en la llamada.
  const ttl =
    typeof opts.expiresInDays === "number" &&
    INVITE_TTL_DAYS.includes(opts.expiresInDays)
      ? opts.expiresInDays
      : DEFAULT_INVITE_TTL_DAYS;

  // Una invitación dirigida es por definición de un solo uso: es para esa
  // persona. El tope explícito sólo tiene sentido en los links abiertos.
  const maxUses =
    email !== null
      ? 1
      : typeof opts.maxUses === "number" && opts.maxUses > 0
        ? Math.floor(opts.maxUses)
        : null;

  const raw = newToken();
  const [row] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId,
      email,
      role,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttl * DAY_MS),
      maxUses,
      createdBy: actor.userId,
    })
    .returning({ id: workspaceInvitations.id });

  const url = inviteUrlFor(raw);

  let emailSent = false;
  if (email && opts.sendEmail) {
    const [[ws], [inviter]] = await Promise.all([
      db
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1),
      db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, actor.userId))
        .limit(1),
    ]);
    try {
      await sendWorkspaceInviteEmail({
        to: email,
        workspaceName: ws?.name ?? "un entorno",
        inviterName: inviter?.name ?? inviter?.email ?? null,
        inviteUrl: url,
        expiresInDays: ttl,
      });
      emailSent = true;
    } catch (err) {
      // Resend caído o sin configurar no debe perder la invitación: ya está
      // creada y el link se devuelve igual para copiarlo a mano.
      logger.error("invite.email_failed", { workspaceId, err });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/admin");
  return { id: row.id, url, emailSent };
}

// ─── Listar y revocar ─────────────────────────────────────────────────────────

/**
 * Invitaciones del entorno, la más nueva primero.
 *
 * `url` viene siempre en null: el link sólo existe en claro en la respuesta de
 * `createWorkspaceInvite`. Está en el tipo para que la UI no invente que puede
 * volver a mostrarlo.
 */
export async function listWorkspaceInvites(
  workspaceId: string
): Promise<InviteRow[]> {
  await requireWorkspaceManage(workspaceId);
  const rows = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      maxUses: workspaceInvitations.maxUses,
      usedCount: workspaceInvitations.usedCount,
      revokedAt: workspaceInvitations.revokedAt,
      createdAt: workspaceInvitations.createdAt,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(workspaceInvitations)
    .leftJoin(users, eq(users.id, workspaceInvitations.createdBy))
    .where(eq(workspaceInvitations.workspaceId, workspaceId))
    .orderBy(desc(workspaceInvitations.createdAt));

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expiresAt.toISOString(),
    maxUses: r.maxUses,
    usedCount: r.usedCount,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdByName ?? r.createdByEmail ?? null,
    url: null,
  }));
}

/** Corta el link de inmediato. No borra la fila: queda el rastro de que existió. */
export async function revokeWorkspaceInvite(inviteId: string): Promise<void> {
  // El id de la invitación no dice a qué entorno pertenece, así que primero se
  // resuelve y recién ahí se autoriza. Al revés sería un IDOR.
  const [inv] = await db
    .select({ workspaceId: workspaceInvitations.workspaceId })
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.id, inviteId))
    .limit(1);
  if (!inv) throw new Error("Invitación no encontrada");

  await requireWorkspaceManage(inv.workspaceId);

  await db
    .update(workspaceInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(workspaceInvitations.id, inviteId),
        isNull(workspaceInvitations.revokedAt)
      )
    );
  revalidatePath("/settings");
  revalidatePath("/admin");
}

// ─── Canje ────────────────────────────────────────────────────────────────────

/**
 * Qué hay del otro lado de un link, para pintar la pantalla de aceptación.
 *
 * Sin sesión a propósito: quien recibe el link puede no tener cuenta todavía,
 * y necesita ver a qué lo están invitando ANTES de decidir registrarse.
 * Por eso devuelve lo mínimo — nombre del entorno, quién invita, cuándo vence
 * — y nada del contenido.
 */
export async function getInvitePreview(
  rawToken: string
): Promise<InvitePreview> {
  if (!rawToken) return { status: "invalid" };

  const [row] = await db
    .select({
      role: workspaceInvitations.role,
      email: workspaceInvitations.email,
      expiresAt: workspaceInvitations.expiresAt,
      maxUses: workspaceInvitations.maxUses,
      usedCount: workspaceInvitations.usedCount,
      revokedAt: workspaceInvitations.revokedAt,
      workspaceName: workspaces.name,
      workspaceColor: workspaces.color,
      invitedByName: users.name,
      invitedByEmail: users.email,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .leftJoin(users, eq(users.id, workspaceInvitations.createdBy))
    .where(eq(workspaceInvitations.tokenHash, hashToken(rawToken)))
    .limit(1);

  // Token que no existe: no se distingue de uno inventado, y está bien.
  if (!row) return { status: "invalid" };

  // Estos tres SÍ se distinguen entre sí. Saber "venció" en vez de "inválido"
  // no filtra nada útil (ya tenías el token) y cambia por completo qué hacer:
  // pedir uno nuevo en vez de pensar que copiaste mal el link.
  if (row.revokedAt) {
    return { status: "revoked", workspaceName: row.workspaceName };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired", workspaceName: row.workspaceName };
  }
  if (row.maxUses !== null && row.usedCount >= row.maxUses) {
    return { status: "exhausted", workspaceName: row.workspaceName };
  }

  return {
    status: "ok",
    workspaceName: row.workspaceName,
    workspaceColor: row.workspaceColor,
    role: row.role,
    invitedByName: row.invitedByName ?? row.invitedByEmail ?? null,
    emailHint: row.email ? maskEmail(row.email) : null,
    expiresAt: row.expiresAt.toISOString(),
  };
}

/**
 * Canjea el link con la sesión actual.
 *
 * Exige estar logueado: la pantalla de invitación manda a /signup o /login con
 * `next` apuntando de vuelta acá. Es lo que hace que del otro lado siempre
 * quede una persona identificable y no un anónimo con una llave.
 */
export async function acceptInvite(
  rawToken: string
): Promise<{ workspaceId: string; workspaceName: string; alreadyMember: boolean }> {
  const user = await requireUser();

  const [inv] = await db
    .select({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      workspaceName: workspaces.name,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(eq(workspaceInvitations.tokenHash, hashToken(rawToken)))
    .limit(1);

  if (!inv) throw new Error("Esta invitación no existe");

  // Invitación dirigida: el link reenviado a otra persona no sirve.
  if (inv.email && normalizeEmail(user.email ?? "") !== inv.email) {
    throw new Error(
      "Esta invitación es para otra cuenta. Iniciá sesión con el correo al que llegó."
    );
  }

  // Ya es miembro: no consume un uso ni le toca el rol. Hace que volver a
  // abrir el link sea inofensivo — y sobre todo, que un link abierto con rol
  // "member" no pueda DEGRADAR a un admin que lo abra por curiosidad.
  const [existing] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, inv.workspaceId),
        eq(workspaceMembers.userId, user.id)
      )
    )
    .limit(1);
  if (existing) {
    return {
      workspaceId: inv.workspaceId,
      workspaceName: inv.workspaceName,
      alreadyMember: true,
    };
  }

  // Reserva del cupo y validación de vigencia en UNA sentencia. Leer y después
  // escribir dejaría pasar dos aceptaciones simultáneas por el mismo último
  // uso: ambas leerían used_count = maxUses - 1 y ambas escribirían.
  const claimed = await db
    .update(workspaceInvitations)
    .set({ usedCount: sql`${workspaceInvitations.usedCount} + 1` })
    .where(
      and(
        eq(workspaceInvitations.id, inv.id),
        isNull(workspaceInvitations.revokedAt),
        sql`${workspaceInvitations.expiresAt} > now()`,
        sql`(${workspaceInvitations.maxUses} is null or ${workspaceInvitations.usedCount} < ${workspaceInvitations.maxUses})`
      )
    )
    .returning({ id: workspaceInvitations.id });

  if (claimed.length === 0) {
    // No pasó el WHERE: vencida, revocada o sin cupo. El preview de la pantalla
    // ya dice cuál; acá alcanza con no dejar entrar.
    throw new Error("Esta invitación ya no es válida");
  }

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: inv.workspaceId,
      userId: user.id,
      role: inv.role,
    })
    // Carrera con un addWorkspaceMember manual en el mismo instante: si ya
    // entró por otro lado, se respeta ese rol y no se pisa.
    .onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
    });

  await createNotification({
    userId: user.id,
    type: "workspace_member_added",
    payload: {
      title: "Te sumaste a un entorno",
      body: inv.workspaceName,
      refs: { workspaceId: inv.workspaceId },
    },
    href: "/dashboard",
  });

  revalidatePath("/dashboard");
  return {
    workspaceId: inv.workspaceId,
    workspaceName: inv.workspaceName,
    alreadyMember: false,
  };
}
