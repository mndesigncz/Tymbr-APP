// Parses a note into a client → project → task tree.
//
// The hierarchy is driven by three inline semantic marks ("písma") that the
// notes editor applies to spans of text — separate from the visual markdown
// headings (#, ##, ###), which are purely typographic and carry no meaning for
// task generation. Each mark is stored inline as a token:
//
//   @klient{Acme}      → client   (Klientské písmo)
//   @projekt{Web 2026} → project  (Projektové písmo)
//   @úkol{Homepage}    → task     (Úkolové písmo)
//
// Marks are scanned in document order. A mark shallower than the current
// context is tolerated: an @úkol before any @klient/@projekt becomes a task
// with no project/client; an @projekt before any @klient a project with no
// client.

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
  word: string;  // the word after @ inside the token
  label: string; // human label for the toolbar button
}

export const NOTE_MARKS: NoteMark[] = [
  { key: "client", word: "klient", label: "Klientské písmo" },
  { key: "project", word: "projekt", label: "Projektové písmo" },
  { key: "task", word: "úkol", label: "Úkolové písmo" },
];

export const WORD_TO_KEY: Record<string, NoteMarkKey> = {
  klient: "client",
  projekt: "project",
  "úkol": "task",
};

export const KEY_TO_WORD: Record<NoteMarkKey, string> = {
  client: "klient",
  project: "projekt",
  task: "úkol",
};

// Matches a single inline mark token, capturing the word and inner text.
// Use a fresh RegExp (with the `g` flag) when iterating to avoid shared state.
export function inlineMarkRegex(): RegExp {
  return /@(klient|projekt|úkol)\{([^}]*)\}/g;
}

/** Remove inline markdown decoration and zero-width chars for clean text. */
function stripInline(s: string): string {
  return s
    .replace(/[​﻿]/g, "")
    .replace(/<\/?(?:u|mark|strong|em|b|i)>/gi, "")
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

  for (const m of content.matchAll(inlineMarkRegex())) {
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

  // Drop empty clients/projects (a mark with no task underneath is no work).
  return clients
    .map((c) => ({ ...c, projects: c.projects.filter((p) => p.tasks.length > 0) }))
    .filter((c) => c.projects.length > 0);
}

/** Total number of tasks contained in a parsed tree. */
export function countTasks(tree: ParsedClient[]): number {
  return tree.reduce((sum, c) => sum + c.projects.reduce((s, p) => s + p.tasks.length, 0), 0);
}

/**
 * Strips all markup (inline marks, heading hashes, list bullets and inline
 * decoration) from note content so it can be shown as a clean plain-text
 * preview in lists, chat shares and pre-filled task descriptions.
 */
export function noteToPlainText(content: string): string {
  const noTokens = content.replace(inlineMarkRegex(), "$2");
  return noTokens
    .split(/\r?\n/)
    .map((line) =>
      stripInline(
        line
          .replace(/^#{1,6}\s+/, "")
          .replace(/^\s*[-*+]\s+/, "")
          .replace(/^\s*\d+[.)]\s+/, "")
      )
    )
    .join("\n")
    .trim();
}
