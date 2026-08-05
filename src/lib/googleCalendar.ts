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

/* ── write-back (Tymbr → Google) ───────────────────────────────────────── */

export interface TymbrEventShape {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  allDay: boolean;
  recurring?: string | null;
  recurringUntil?: Date | string | null;
}

const FREQ: Record<string, string> = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" };

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Build the Google event resource from a Tymbr event.
function toGoogleBody(ev: TymbrEventShape): Record<string, any> {
  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const body: Record<string, any> = {
    summary: ev.title,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
  };
  if (ev.allDay) {
    // Google treats the all-day end date as exclusive → add a day to the last day.
    const lastDay = end < start ? start : end;
    body.start = { date: ymd(start) };
    body.end = { date: ymd(new Date(lastDay.getTime() + 24 * 60 * 60 * 1000)) };
  } else {
    body.start = { dateTime: start.toISOString() };
    body.end = { dateTime: (end <= start ? new Date(start.getTime() + 3600000) : end).toISOString() };
  }
  if (ev.recurring && FREQ[ev.recurring]) {
    let rule = `RRULE:FREQ=${FREQ[ev.recurring]}`;
    if (ev.recurringUntil) {
      const u = new Date(ev.recurringUntil);
      rule += `;UNTIL=${u.getUTCFullYear()}${String(u.getUTCMonth() + 1).padStart(2, "0")}${String(u.getUTCDate()).padStart(2, "0")}T235959Z`;
    }
    body.recurrence = [rule];
  }
  return body;
}

/** Create the event in the user's Google Calendar; returns the new Google id. */
export async function insertGoogleEvent(userId: string, ev: TymbrEventShape): Promise<string | null> {
  const auth = await getAccessToken(userId);
  if (!auth) return null;
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(ev)),
  });
  if (!res.ok) { console.error("[googleCalendar.insert]", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json();
  return data.id ?? null;
}

/** Update a mirrored event; returns true on success. */
export async function updateGoogleEvent(userId: string, googleEventId: string, ev: TymbrEventShape): Promise<boolean> {
  const auth = await getAccessToken(userId);
  if (!auth) return false;
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(ev)),
  });
  if (!res.ok && res.status !== 404) console.error("[googleCalendar.update]", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** Delete a mirrored event. 404/410 (already gone) count as success. */
export async function deleteGoogleEvent(userId: string, googleEventId: string): Promise<boolean> {
  const auth = await getAccessToken(userId);
  if (!auth) return false;
  const res = await fetch(`${API_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  return res.ok || res.status === 404 || res.status === 410;
}

/** True if the user has a connected Google Calendar. */
export async function hasGoogleCalendar(userId: string): Promise<boolean> {
  const acct = await prisma.googleCalendarAccount.findUnique({ where: { userId }, select: { id: true } });
  return !!acct;
}
