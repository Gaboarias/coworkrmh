import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { decryptToken, encryptToken } from "./crypto";
import {
  googleConfigured,
  refreshGoogleAccess,
  fetchGoogleEvents,
  type NormalizedMeeting,
} from "./google";

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
  } catch {
    return [];
  }
  if (!conn) return [];

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
  } catch {
    return [];
  }
}

export interface CalendarStatus {
  connected: boolean;
  provider: string | null;
  email: string | null;
}

export async function getCalendarStatus(
  userId: string
): Promise<CalendarStatus> {
  if (!googleConfigured()) {
    return { connected: false, provider: null, email: null };
  }
  try {
    const [conn] = await db
      .select({
        provider: calendarConnections.provider,
        email: calendarConnections.accountEmail,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))
      .limit(1);
    return conn
      ? { connected: true, provider: conn.provider, email: conn.email }
      : { connected: false, provider: null, email: null };
  } catch {
    return { connected: false, provider: null, email: null };
  }
}
