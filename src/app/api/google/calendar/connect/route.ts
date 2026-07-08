import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { buildAuthUrl, googleConfigured } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

function base() {
  return (process.env.NEXTAUTH_URL ?? "https://noisium.app").replace(/\/$/, "");
}

// Kicks off the Google OAuth consent flow to connect a calendar.
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.redirect(`${base()}/login`);
  if (!googleConfigured()) return NextResponse.redirect(`${base()}/calendar?gcal=notconfigured`);

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("gcal_state", state, {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600,
  });
  return res;
}
