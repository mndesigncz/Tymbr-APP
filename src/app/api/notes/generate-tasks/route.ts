import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/notes/generate-tasks
// Body: { clients: [{ name: string|null, projects: [{ name: string|null, tasks: string[] }] }] }
//
// Materializes a note's heading hierarchy into real clients, projects and
// tasks. Existing clients/projects are reused (matched case-insensitively by
// name within the team) so re-running on an edited note doesn't create
// duplicates. Tasks are always created fresh.

interface InProject {
  name: string | null;
  tasks: unknown;
}
interface InClient {
  name: string | null;
  projects: unknown;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });
  const userId = session.user.id as string;

  const body = await req.json().catch(() => ({}));
  const clients: InClient[] = Array.isArray(body.clients) ? body.clients : [];
  if (clients.length === 0) {
    return NextResponse.json({ error: "Není z čeho vytvořit úkoly" }, { status: 400 });
  }

  let clientsCreated = 0;
  let projectsCreated = 0;
  let tasksCreated = 0;
  const createdTaskIds: string[] = [];

  for (const c of clients) {
    const clientName = typeof c.name === "string" ? c.name.trim() : "";
    let clientId: string | null = null;

    if (clientName) {
      const existing = await prisma.client.findFirst({
        where: { teamId, name: { equals: clientName, mode: "insensitive" } },
        select: { id: true },
      });
      if (existing) {
        clientId = existing.id;
      } else {
        const created = await prisma.client.create({
          data: { name: clientName, teamId, createdById: userId },
          select: { id: true },
        });
        clientId = created.id;
        clientsCreated++;
      }
    }

    const projects: InProject[] = Array.isArray(c.projects) ? (c.projects as InProject[]) : [];
    for (const p of projects) {
      const projectName = typeof p.name === "string" ? p.name.trim() : "";
      let projectId: string | null = null;

      if (projectName) {
        const existing = await prisma.project.findFirst({
          where: {
            teamId,
            name: { equals: projectName, mode: "insensitive" },
            clientId: clientId ?? null,
          },
          select: { id: true },
        });
        if (existing) {
          projectId = existing.id;
        } else {
          const created = await prisma.project.create({
            data: { name: projectName, teamId, clientId, createdById: userId },
            select: { id: true },
          });
          projectId = created.id;
          projectsCreated++;
        }
      }

      const tasks: string[] = Array.isArray(p.tasks)
        ? p.tasks.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        : [];
      for (const title of tasks) {
        const rows = await prisma.$queryRaw<any[]>`
          INSERT INTO "Task" (id, title, status, priority, "projectId", "createdById", "teamId", recurring, "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${title.trim()}, 'todo', 'medium', ${projectId}, ${userId}, ${teamId}, 'none', NOW(), NOW())
          RETURNING id
        `;
        createdTaskIds.push(rows[0].id);
        tasksCreated++;
      }
    }
  }

  return NextResponse.json({
    clientsCreated,
    projectsCreated,
    tasksCreated,
    taskIds: createdTaskIds,
  });
}
