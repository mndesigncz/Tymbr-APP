import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Update the current user's profile (display name + avatar).
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela" }, { status: 401 });

  try {
    const { name, avatar } = await req.json();

    const trimmedName = typeof name === "string" ? name.trim() : undefined;
    if (trimmedName !== undefined && !trimmedName) {
      return NextResponse.json({ error: "Jméno nesmí být prázdné" }, { status: 400 });
    }

    // avatar: data URL string to set, empty string/null to remove, undefined to keep
    if (avatar !== undefined && typeof avatar === "string" && avatar.length > 1_500_000) {
      return NextResponse.json({ error: "Obrázek je příliš velký" }, { status: 400 });
    }

    const data: Record<string, any> = {};
    if (trimmedName !== undefined) data.name = trimmedName;
    if (avatar !== undefined) data.avatar = avatar || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
