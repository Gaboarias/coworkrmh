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

export class EmailAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Lanza EmailAuthError si no es admin. Devuelve el user si pasa. */
export async function requireEmailRole() {
  const session = await auth();
  if (!session?.user) throw new EmailAuthError("No autenticado", 401);
  if (session.user.role !== "admin")
    throw new EmailAuthError("No autorizado", 403);
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
