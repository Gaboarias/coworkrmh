/**
 * Guards de autorización — punto único para los server actions.
 *
 * Por qué existe: los actions son `"use server"`, o sea endpoints HTTP que
 * cualquier usuario autenticado puede invocar con los argumentos que quiera.
 * La autorización no se ve en la firma, así que hasta ahora era una convención
 * que había que recordar — y había SIETE preámbulos distintos repartidos entre
 * los 17 archivos de actions (dos definiciones separadas de `requireAdmin`,
 * un `requireUser` propio en tasks.ts, `await auth()` suelto en varios).
 * Olvidarse era gratis: así se colaron listClientProjects y listClientPayments
 * sin chequeo de rol.
 *
 * Ahora hay un solo lugar, y `src/tests/action-guards.test.ts` falla si un
 * action exportado no pasa por ninguno de estos.
 *
 * Dos ejes de permiso, no mezclarlos:
 *  - Rol GLOBAL (users.role: admin | manager | member) → requireAdmin /
 *    requireManagerOrAdmin. Se usa para lo que NO está scopeado a un entorno
 *    (administración, CRM de clientes).
 *  - Capacidad por ENTORNO (workspaces.role_permissions) → requireWsCan.
 *    Es el eje por defecto para todo lo que vive dentro de un entorno.
 */

import { auth } from "@/lib/auth";
import { getActiveWorkspace, getWorkspacePermissions } from "@/lib/workspace";

export {
  requireProjectAccess,
  requireWorkspaceManage,
  requireWorkspaceOwner,
} from "@/lib/workspace";

/** Sesión válida. Es el piso: no autoriza nada por sí solo. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

/**
 * Usuario actual o `null`, sin lanzar.
 *
 * Para lecturas que degradan a vacío en vez de romper la pantalla (bandeja de
 * notificaciones, contador de no leídas, comentarios). Sigue siendo una
 * decisión de autorización explícita: el llamador DEBE acotar la query por el
 * id que devuelve. No usar en mutaciones.
 */
export async function optionalUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Rol global `admin`. Para administración del sistema. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("No autorizado");
  return user;
}

/**
 * Rol global `admin` o `manager`.
 *
 * Los clientes y los pagos NO tienen workspaceId (son globales), así que el
 * rol global es la única barrera posible hoy. Si algún día se scopean por
 * entorno, esto pasa a ser requireWsCan("clients.read").
 */
export async function requireManagerOrAdmin() {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "manager") {
    throw new Error("Permisos insuficientes");
  }
  return user;
}

/**
 * Sesión + entorno activo + set de capacidades resuelto.
 *
 * Devuelve el `user` completo además de `userId`: varios actions necesitan
 * nombre/email para las notificaciones, y sin esto tendrían que volver a
 * pedir la sesión.
 */
export async function requireWs() {
  const user = await requireUser();
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error("Selecciona un entorno");
  const { permissions } = await getWorkspacePermissions(ws.id);
  return {
    ws,
    user,
    userId: user.id,
    can: (key: string) => permissions.has(key),
  };
}

/** requireWs + exige una capacidad concreta en el entorno activo. */
export async function requireWsCan(key: string) {
  const ctx = await requireWs();
  if (!ctx.can(key)) {
    throw new Error("No tenés permiso para esta acción en este entorno");
  }
  return ctx;
}
