import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { decryptToken, encryptToken } from "./crypto";
import {
  googleConfigured,
  refreshGoogleAccess,
  fetchGoogleEvents,
  GoogleAuthRevokedError,
  type NormalizedMeeting,
} from "./google";
import { logger } from "@/lib/logger";

/**
 * Trae las reuniones del usuario (calendario conectado) en una ventana de
 * tiempo. Refresca el access token si está por expirar y lo persiste.
 * Defensivo: devuelve [] ante cualquier error (sin conexión, tabla ausente,
 * token revocado, API caída) para no romper /calendar nunca.
 */
export async function getUserMeetings(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<NormalizedMeeting[]> {
  if (!googleConfigured()) return [];

  let conn:
    | typeof calendarConnections.$inferSelect
    | undefined;
  try {
    [conn] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, "google")
        )
      )
      .limit(1);
  } catch (err) {
    logger.error("gcal_conn_fetch_failed", { userId, err: String(err) });
    return [];
  }
  if (!conn) return [];

  // Conexión ya marcada como caída: no se reintenta hasta que la persona
  // reconecte. La UI se lo está pidiendo (ver getCalendarStatus).
  if (conn.invalidatedAt) return [];

  try {
    let accessToken = decryptToken(conn.accessToken);
    // Refrescar si expira en <60s.
    if (new Date(conn.expiresAt).getTime() < Date.now() + 60_000) {
      const refreshed = await refreshGoogleAccess(
        decryptToken(conn.refreshToken)
      );
      accessToken = refreshed.accessToken;
      await db
        .update(calendarConnections)
        .set({
          accessToken: encryptToken(accessToken),
          expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, conn.id));
    }
    return await fetchGoogleEvents(accessToken, timeMin, timeMax);
  } catch (err) {
    // `invalid_grant` es permanente: el usuario revocó, cambió su contraseña,
    // o —lo más probable acá— pasaron los 7 días que Google le da a un refresh
    // token con la app en modo Testing. Se sella la conexión para que
    // /settings lo diga en vez de mostrar un calendario vacío y "conectado".
    if (err instanceof GoogleAuthRevokedError) {
      logger.warn("gcal_revoked", { userId });
      await db
        .update(calendarConnections)
        .set({ invalidatedAt: new Date(), updatedAt: new Date() })
        .where(eq(calendarConnections.id, conn.id))
        .catch(() => {});
      return [];
    }
    // Cualquier otra cosa (5xx, red, API caída) es transitoria: se devuelve
    // vacío para no romper /calendar, pero NO se marca la conexión.
    logger.error("gcal_events_failed", { userId, err: String(err) });
    return [];
  }
}

export interface CalendarStatus {
  connected: boolean;
  provider: string | null;
  email: string | null;
  /**
   * Hay una conexión guardada pero Google ya no la acepta. Distinto de
   * `connected: false`: la diferencia entre "nunca conectaste" y "se te
   * venció" es toda la diferencia para quien lee la pantalla.
   */
  needsReconnect: boolean;
}

const SIN_CONEXION: CalendarStatus = {
  connected: false,
  provider: null,
  email: null,
  needsReconnect: false,
};

export async function getCalendarStatus(
  userId: string
): Promise<CalendarStatus> {
  if (!googleConfigured()) return SIN_CONEXION;
  try {
    const [conn] = await db
      .select({
        provider: calendarConnections.provider,
        email: calendarConnections.accountEmail,
        invalidatedAt: calendarConnections.invalidatedAt,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))
      .limit(1);
    if (!conn) return SIN_CONEXION;
    return {
      connected: true,
      provider: conn.provider,
      email: conn.email,
      needsReconnect: conn.invalidatedAt !== null,
    };
  } catch (err) {
    logger.error("gcal_status_failed", { userId, err: String(err) });
    return SIN_CONEXION;
  }
}
