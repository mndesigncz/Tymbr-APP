// Parses a note into a client → project → task tree.
//
// The hierarchy is driven by three semantic line markers ("písma") that the
// notes toolbar inserts — deliberately separate from the visual markdown
// headings (#, ##, ###), which are now purely typographic (nadpis / podnadpis
// / název) and carry no meaning for task generation.
//
//   @klient  <name>   → client   (Klientské písmo)
//   @projekt <name>   → project  (Projektové písmo)
//   @úkol    <name>   → task     (Úkolové písmo)
//
// A marker shallower than the current context is tolerated: an @úkol before any
// @klient/@projekt becomes a task with no project/client; an @projekt before
// any @klient becomes a project with no client.

export interface ParsedProject {
  name: string | null;
  tasks: string[];
}

export interface ParsedClient {
  name: string | null;
  projects: ParsedProject[];
}

export type NoteMarkKey = "client" | "project" | "task";

export interface NoteMark {
  key: NoteMarkKey;
  token: string; // literal prefix stored in the note content
  word: string;  // the word after @ (used in regexes)
  label: string; // human label for the toolbar button
}

export const NOTE_MARKS: NoteMark[] = [
  { key: "client", token: "@klient", word: "klient", label: "Klientské písmo" },
  { key: "project", token: "@projekt", word: "projekt", label: "Projektové písmo" },
  { key: "task", token: "@úkol", word: "úkol", label: "Úkolové písmo" },
];

const WORD_TO_KEY: Record<string, NoteMarkKey> = {
  klient: "client",
  projekt: "project",
  "úkol": "task",
};

// Matches a marked line, capturing the marker word and the remaining text.
export const MARK_LINE_RE = /^\s*@(klient|projekt|úkol)\s*(.*)$/;

/** Remove inline markdown decoration so names/titles are clean plain text. */
function stripInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
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
    const m = rawLine.match(MARK_LINE_RE);
    if (!m) continue;
    const key = WORD_TO_KEY[m[1]];
    const text = stripInline(m[2]);

    if (key === "client") {
      currentClient = { name: text || null, projects: [] };
      currentProject = null;
      clients.push(currentClient);
    } else if (key === "project") {
      currentProject = { name: text || null, tasks: [] };
      ensureClient().projects.push(currentProject);
    } else if (key === "task") {
      if (text) ensureProject().tasks.push(text);
    }
  }

  // Drop empty clients/projects (a marker with no task underneath is no work).
  return clients
    .map((c) => ({ ...c, projects: c.projects.filter((p) => p.tasks.length > 0) }))
    .filter((c) => c.projects.length > 0);
}

/** Total number of tasks contained in a parsed tree. */
export function countTasks(tree: ParsedClient[]): number {
  return tree.reduce((sum, c) => sum + c.projects.reduce((s, p) => s + p.tasks.length, 0), 0);
}

/**
 * Strips all markup (semantic markers, heading hashes, list bullets and inline
 * decoration) from note content so it can be shown as a clean plain-text
 * preview in lists, chat shares and pre-filled task descriptions.
 */
export function noteToPlainText(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) =>
      stripInline(
        line
          .replace(MARK_LINE_RE, "$2")
          .replace(/^#{1,6}\s+/, "")
          .replace(/^\s*[-*+]\s+/, "")
          .replace(/^\s*\d+[.)]\s+/, "")
      )
    )
    .join("\n")
    .trim();
}
