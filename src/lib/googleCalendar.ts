import { prisma } from "./prisma";

// Thin Google Calendar integration over the REST API (no SDK dependency).
//
// Configuration (set in the deployment environment):
//   GOOGLE_CLIENT_ID       — OAuth 2.0 client id
//   GOOGLE_CLIENT_SECRET   — OAuth 2.0 client secret
//   NEXTAUTH_URL           — app base url (used to build the redirect uri)
//
// The redirect URI you must register in Google Cloud Console is:
//   <NEXTAUTH_URL>/api/google/calendar/callback

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";

// calendar.events covers reading and writing events (enough for two-way sync);
// email/openid let us show which Google account is connected.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = (process.env.NEXTAUTH_URL ?? "https://noisium.app").replace(/\/$/, "");
  return `${base}/api/google/calendar/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",   // ask for a refresh token
    prompt: "consent",        // force refresh-token issuance on reconnect
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

/** Decode the email claim out of an OpenID id_token (no signature check needed —
 *  it came straight from Google's token endpoint over TLS). */
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return json.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
    email: emailFromIdToken(data.id_token),
  };
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
  };
}

/** Return a valid access token for the user, refreshing + persisting if needed. */
export async function getAccessToken(userId: string): Promise<{ token: string; calendarId: string } | null> {
  const acct = await prisma.googleCalendarAccount.findUnique({ where: { userId } });
  if (!acct) return null;
  if (acct.expiresAt.getTime() > Date.now() + 30_000) {
    return { token: acct.accessToken, calendarId: acct.calendarId };
  }
  const refreshed = await refreshAccessToken(acct.refreshToken);
  await prisma.googleCalendarAccount.update({
    where: { userId },
    data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
  });
  return { token: refreshed.accessToken, calendarId: acct.calendarId };
}

export interface GoogleEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  source: "google";
}

/** List events in [timeMin, timeMax], expanding recurring instances. */
export async function listEvents(userId: string, timeMin: Date, timeMax: Date): Promise<GoogleEvent[]> {
  const auth = await getAccessToken(userId);
  if (!auth) return [];
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok) {
    console.error("[googleCalendar.listEvents]", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = await res.json();
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((it) => it.status !== "cancelled" && (it.start?.dateTime || it.start?.date))
    .map((it): GoogleEvent => {
      const allDay = !it.start?.dateTime;
      const startAt = it.start?.dateTime ?? `${it.start?.date}T00:00:00`;
      const endAt = it.end?.dateTime ?? `${it.end?.date}T00:00:00`;
      return {
        id: it.id,
        title: it.summary ?? "(bez názvu)",
        description: it.description ?? null,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allDay,
        location: it.location ?? null,
        htmlLink: it.htmlLink ?? null,
        source: "google",
      };
    });
}
