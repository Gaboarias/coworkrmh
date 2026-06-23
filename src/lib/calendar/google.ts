import { getAppUrl } from "@/lib/email";

/**
 * Cliente OAuth + Google Calendar API (read-only) usando fetch plano — sin
 * la SDK googleapis (cero dependencias nuevas). Solo lectura de eventos.
 */

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_EVENTS =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export function googleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

export function googleRedirectUri(): string {
  return `${getAppUrl()}/api/calendar/google/callback`;
}

export function getGoogleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // queremos refresh token
    prompt: "consent", // fuerza refresh token aunque ya haya consentido
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH}?${p.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number;
  email: string | null;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange falló (${res.status})`);
  }
  const data = await res.json();

  let email: string | null = null;
  try {
    const u = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (u.ok) email = (await u.json()).email ?? null;
  } catch {
    /* email es best-effort */
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    email,
  };
}

export async function refreshGoogleAccess(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh falló (${res.status})`);
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export interface NormalizedMeeting {
  id: string;
  title: string;
  start: string; // ISO (dateTime) o YYYY-MM-DD (allDay)
  end: string;
  allDay: boolean;
  location: string | null;
  url: string | null;
}

export async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<NormalizedMeeting[]> {
  const p = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`${GOOGLE_EVENTS}?${p.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google events fetch falló (${res.status})`);
  const data = await res.json();
  return (data.items ?? [])
    .filter((e: { status?: string }) => e.status !== "cancelled")
    .map(
      (e: {
        id: string;
        summary?: string;
        location?: string;
        htmlLink?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }): NormalizedMeeting => {
        const allDay = !!e.start?.date;
        return {
          id: e.id,
          title: e.summary ?? "(sin título)",
          start: e.start?.dateTime ?? e.start?.date ?? "",
          end: e.end?.dateTime ?? e.end?.date ?? "",
          allDay,
          location: e.location ?? null,
          url: e.htmlLink ?? null,
        };
      }
    )
    .filter((m: NormalizedMeeting) => m.start);
}
