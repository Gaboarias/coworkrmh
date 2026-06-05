export type UserRole = "admin" | "manager" | "member";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
/**
 * Pipeline de proyectos (orden de business flow).
 *
 * Los 6 estados visibles + 'archived' como oculto.
 *
 * Los valores viejos (active, paused, in_review, stopped, completed) se
 * mantienen sólo por compat del enum Postgres (no se pueden DROP). El
 * runtime nuevo no los usa — el endpoint de migración los reescribe a
 * 'prospecto'. Se eliminarán del tipo TS en una cleanup futura.
 */
export type ProjectStatus =
  | "prospecto"
  | "primer_contrato"
  | "firmado"
  | "operaciones"
  | "retomar"
  | "descartado"
  | "archived"
  // Legacy — pueden aparecer en data vieja antes de correr la migración.
  | "active"
  | "paused"
  | "in_review"
  | "stopped"
  | "completed";
export type ClientStatus = "active" | "inactive" | "prospect";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
