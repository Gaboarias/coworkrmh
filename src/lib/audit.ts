/**
 * Audit trail para acciones admin (S-03 del tech-debt-audit).
 *
 * Reutiliza la tabla `changelog` existente — projectId nullable permite
 * usarla para eventos a nivel cuenta (cambio de password admin, role
 * change, etc.). entityType = "user" o "workspace_membership" para
 * filtrar después.
 *
 * Uso:
 *   await logAdminAction({
 *     actorId: session.user.id,
 *     entityType: "user",
 *     entityId: targetUserId,
 *     action: "updated",
 *     description: `Admin reseteó contraseña de ${targetEmail}`,
 *     newValue: { passwordReset: true },  // NUNCA pongas la password
 *   });
 *
 * NO loguea valores sensibles (passwords, tokens, bcrypt hashes). El campo
 * newValue solo es para metadata booleana o IDs.
 */

import { db } from "@/lib/db";
import { changelog } from "@/lib/db/schema";

interface AdminActionLog {
  actorId: string;
  entityType: "user" | "workspace_membership" | "password_reset" | string;
  entityId: string;
  /** Reusa el changelog_action enum: "updated", "created", "deleted", etc. */
  action:
    | "updated"
    | "created"
    | "deleted"
    | "status_changed"
    | "assigned"
    | "unassigned";
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function logAdminAction(input: AdminActionLog): Promise<void> {
  try {
    await db.insert(changelog).values({
      userId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      oldValue: (input.oldValue ?? null) as object | null,
      newValue: (input.newValue ?? null) as object | null,
    });
  } catch {
    // Audit trail no es crítico para el endpoint — si falla, no romper la
    // acción del admin. (En producción de verdad esto iría a una cola.)
  }
}
