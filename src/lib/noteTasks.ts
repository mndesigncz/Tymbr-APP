// Parses a note written in markdown into a client → project → task tree.
//
// Heading hierarchy convention (as requested by the team):
//   #   H1  → client name   (Klient)
//   ##  H2  → project name  (Projekt)
//   ### H3  → task name      (Úkol)
//
// Anything shallower than the current context is tolerated: an H3 that appears
// before any H1/H2 becomes a task with no project/client; an H2 before any H1
// becomes a project with no client. This keeps quick "just a list of tasks"
// notes working while still supporting the full hierarchy.

export interface ParsedProject {
  name: string | null;
  tasks: string[];
}

export interface ParsedClient {
  name: string | null;
  projects: ParsedProject[];
}

/** Remove inline markdown decoration so names/titles are clean plain text. */
function stripInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

export function parseNoteToTasks(content: string): ParsedClient[] {
  const clients: ParsedClient[] = [];
  let currentClient: ParsedClient | null = null;
  let currentProject: ParsedProject | null = null;

  const ensureClient = (): ParsedClient => {
    if (!currentClient) {
      currentClient = { name: null, projects: [] };
      clients.push(currentClient);
    }
    return currentClient;
  };
  const ensureProject = (): ParsedProject => {
    const client = ensureClient();
    if (!currentProject) {
      currentProject = { name: null, tasks: [] };
      client.projects.push(currentProject);
    }
    return currentProject;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);

    if (h3) {
      const title = stripInline(h3[1]);
      if (title) ensureProject().tasks.push(title);
    } else if (h2) {
      const name = stripInline(h2[1]) || null;
      currentProject = { name, tasks: [] };
      ensureClient().projects.push(currentProject);
    } else if (h1) {
      const name = stripInline(h1[1]) || null;
      currentClient = { name, projects: [] };
      currentProject = null;
      clients.push(currentClient);
    }
  }

  // Drop empty clients/projects (headings with no tasks underneath produce no work).
  return clients
    .map((c) => ({ ...c, projects: c.projects.filter((p) => p.tasks.length > 0) }))
    .filter((c) => c.projects.length > 0);
}

/** Total number of tasks contained in a parsed tree. */
export function countTasks(tree: ParsedClient[]): number {
  return tree.reduce((sum, c) => sum + c.projects.reduce((s, p) => s + p.tasks.length, 0), 0);
}
