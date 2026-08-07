/**
 * Guard de autorización para las rutas humanas del Email Blaster.
 *
 * Blasting es una acción sensible a nivel de marca → admin-only por ahora
 * (consistente con el flag adminOnly del Sidebar). Si en el futuro se quiere
 * un rol `marketer`, ampliar el check acá en un solo lugar.
 *
 * El cron NO usa esto — se protege con CRON_SECRET. El webhook con firma Svix.
 * El unsubscribe con token HMAC.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { hasFeature } from "@/lib/entitlements";

export class EmailAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Lanza EmailAuthError si no es admin O si el entorno activo no tiene la
 * feature. Devuelve el user si pasa.
 *
 * El chequeo de TIER va acá y no sólo en las páginas: las páginas usan
 * `requireFeature("blaster")`, pero el middleware no toca `/api/*` y estas
 * rutas son endpoints HTTP invocables directo. Sin esto, un admin de un
 * entorno `basic` —que no ve Campañas en el sidebar— podía lanzar una campaña
 * con un fetch. El rol y el tier son dos ejes distintos y hacían falta los dos.
 */
export async function requireEmailRole() {
  const session = await auth();
  if (!session?.user) throw new EmailAuthError("No autenticado", 401);
  if (session.user.role !== "admin")
    throw new EmailAuthError("No autorizado", 403);

  const ws = await getActiveWorkspace();
  if (!ws || !hasFeature(ws.tier, "blaster")) {
    throw new EmailAuthError(
      "Este entorno no tiene habilitadas las campañas",
      403
    );
  }
  return session.user;
}

/** Convierte EmailAuthError en NextResponse JSON; re-lanza el resto. */
export function emailAuthResponse(err: unknown): NextResponse {
  if (err instanceof EmailAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: msg }, { status: 500 });
}
