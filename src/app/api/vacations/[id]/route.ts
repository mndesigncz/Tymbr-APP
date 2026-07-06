import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

const vacationInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  approvedBy: { select: { id: true, name: true, avatar: true } },
};

const TYPE_LABELS: Record<string, string> = {
  vacation: "Dovolená",
  sick: "Nemoc",
  personal: "Volno",
};

// PATCH /api/vacations/[id]
//  - managers can approve/reject:      { approvalStatus: "approved" | "rejected" }
//  - the owner of a pending request can edit its dates/type/note
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id as string;
  const teamId = (session.user as any).teamId as string | undefined;
  const teamRole = (session.user as any).teamRole as string | null;

  const vacation = await prisma.vacation.findUnique({ where: { id } });
  if (!vacation || vacation.teamId !== teamId) {
    return NextResponse.json({ error: "Dovolená nenalezena" }, { status: 404 });
  }

  const body = await req.json();

  // Approve / reject — managers only.
  if (body.approvalStatus === "approved" || body.approvalStatus === "rejected") {
    if (!isManager(teamRole as any)) {
      return NextResponse.json({ error: "Nemáš oprávnění schvalovat dovolenou" }, { status: 403 });
    }
    const updated = await prisma.vacation.update({
      where: { id },
      data: { approvalStatus: body.approvalStatus, approvedById: userId },
      include: vacationInclude,
    });
    if (vacation.userId !== userId) {
      const approved = body.approvalStatus === "approved";
      void createNotification({
        userId: vacation.userId,
        type: approved ? "vacation_approved" : "vacation_rejected",
        title: approved ? "Tvoje dovolená byla schválena" : "Tvoje dovolená byla zamítnuta",
        body: `${TYPE_LABELS[vacation.type] ?? "Dovolená"} · ${formatRange(vacation.startDate, vacation.endDate)}`,
        url: "/vacation",
      });
    }
    return NextResponse.json(updated);
  }

  // Otherwise it's an edit by the owner (only while still pending).
  if (vacation.userId !== userId) {
    return NextResponse.json({ error: "Nemáš oprávnění upravit tuto dovolenou" }, { status: 403 });
  }
  if (vacation.approvalStatus !== "pending") {
    return NextResponse.json({ error: "Už byla vyřízena, nelze upravit" }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if (["vacation", "sick", "personal"].includes(body.type)) data.type = body.type;
  if (body.note !== undefined) data.note = body.note?.trim() || null;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  const start = data.startDate ?? vacation.startDate;
  const end = data.endDate ?? vacation.endDate;
  if (end < start) return NextResponse.json({ error: "Konec nesmí být před začátkem" }, { status: 400 });

  const updated = await prisma.vacation.update({ where: { id }, data, include: vacationInclude });
  return NextResponse.json(updated);
}

// DELETE /api/vacations/[id] — the owner or a manager can remove it.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id as string;
  const teamId = (session.user as any).teamId as string | undefined;
  const teamRole = (session.user as any).teamRole as string | null;

  const vacation = await prisma.vacation.findUnique({ where: { id } });
  if (!vacation || vacation.teamId !== teamId) {
    return NextResponse.json({ error: "Dovolená nenalezena" }, { status: 404 });
  }
  if (vacation.userId !== userId && !isManager(teamRole as any)) {
    return NextResponse.json({ error: "Nemáš oprávnění smazat tuto dovolenou" }, { status: 403 });
  }

  await prisma.vacation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function formatRange(a: Date, b: Date): string {
  const f = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
  return a.getTime() === b.getTime() ? f(a) : `${f(a)} – ${f(b)}`;
}
