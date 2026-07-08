import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { exchangeCode } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

function base() {
  return (process.env.NEXTAUTH_URL ?? "https://noisium.app").replace(/\/$/, "");
}
const back = (status: string) => NextResponse.redirect(`${base()}/calendar?gcal=${status}`);

// Google redirects here after consent. Exchanges the code and stores tokens.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.redirect(`${base()}/login`);
  const userId = session.user.id as string;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gcal_state")?.value;

  if (url.searchParams.get("error")) return back("denied");
  if (!code || !state || !cookieState || state !== cookieState) return back("error");

  try {
    const tok = await exchangeCode(code);
    // Google only returns a refresh token on first consent; reuse the stored one
    // if this is a re-connect that didn't include one.
    const existing = await prisma.googleCalendarAccount.findUnique({ where: { userId } });
    const refreshToken = tok.refreshToken ?? existing?.refreshToken;
    if (!refreshToken) return back("norefresh");

    await prisma.googleCalendarAccount.upsert({
      where: { userId },
      create: {
        userId, email: tok.email, accessToken: tok.accessToken,
        refreshToken, expiresAt: tok.expiresAt,
      },
      update: {
        email: tok.email, accessToken: tok.accessToken,
        refreshToken, expiresAt: tok.expiresAt, syncEnabled: true,
      },
    });

    const res = back("connected");
    res.cookies.delete("gcal_state");
    return res;
  } catch (e: any) {
    console.error("[google/calendar/callback]", e?.message ?? e);
    return back("error");
  }
}
