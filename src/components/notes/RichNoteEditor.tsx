"use client";

import { useEffect, useRef, useState } from "react";
import {
  Heading1, Heading2, Heading3, Bold, Italic,
  Building2, FolderKanban, CheckSquare, ListTree,
} from "lucide-react";
import { NOTE_MARKS, type NoteMarkKey } from "@/lib/noteTasks";

// A lightweight block-based WYSIWYG editor for notes.
//
// Each line is a "block" with a type: plain paragraph, heading (h1/h2/h3) or a
// semantic mark (client/project/task — the three "písma"). Marks render as
// coloured, highlighted blocks; the underlying @klient/@projekt/@úkol tokens are
// never shown. Content round-trips to/from a plain markdown-ish string so the
// rest of the app (task generation, previews, search) keeps working unchanged.

type BlockType = "p" | "h1" | "h2" | "h3" | NoteMarkKey;

const MARK_TOKENS: Record<NoteMarkKey, string> = {
  client: "@klient",
  project: "@projekt",
  task: "@úkol",
};
const WORD_TO_KEY: Record<string, NoteMarkKey> = { klient: "client", projekt: "project", "úkol": "task" };

const MARK_UI: Record<NoteMarkKey, { icon: typeof Building2; color: string; short: string }> = {
  client: { icon: Building2, color: "#ea580c", short: "Klient" },
  project: { icon: FolderKanban, color: "#7c3aed", short: "Projekt" },
  task: { icon: CheckSquare, color: "#16a34a", short: "Úkol" },
};

/* ── (de)serialisation between the stored string and the editor DOM ─────── */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdInlineToHtml(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function lineToBlock(line: string): { type: BlockType; html: string } {
  const mk = line.match(/^\s*@(klient|projekt|úkol)\s?(.*)$/);
  if (mk) return { type: WORD_TO_KEY[mk[1]], html: mdInlineToHtml(mk[2]) };
  const h = line.match(/^(#{1,3})\s+(.*)$/);
  if (h) return { type: ("h" + h[1].length) as BlockType, html: mdInlineToHtml(h[2]) };
  return { type: "p", html: mdInlineToHtml(line) };
}

function prefixFor(type: BlockType): string {
  switch (type) {
    case "client": return MARK_TOKENS.client + " ";
    case "project": return MARK_TOKENS.project + " ";
    case "task": return MARK_TOKENS.task + " ";
    case "h1": return "# ";
    case "h2": return "## ";
    case "h3": return "### ";
    default: return "";
  }
}

// Convert a block's inline DOM into markdown (**bold**, *italic*).
function inlineToMd(node: Node): string {
  let out = "";
  node.childNodes.forEach((ch) => {
    if (ch.nodeType === Node.TEXT_NODE) {
      out += ch.nodeValue ?? "";
    } else if (ch.nodeName === "BR") {
      // ignore filler line-breaks
    } else if (ch.nodeType === Node.ELEMENT_NODE) {
      const el = ch as HTMLElement;
      const fw = el.style?.fontWeight;
      const bold = el.nodeName === "B" || el.nodeName === "STRONG" || fw === "bold" || Number(fw) >= 600;
      const ital = el.nodeName === "I" || el.nodeName === "EM" || el.style?.fontStyle === "italic";
      let inner = inlineToMd(el);
      if (bold) inner = "**" + inner + "**";
      if (ital) inner = "*" + inner + "*";
      out += inner;
    }
  });
  return out;
}

function serialize(root: HTMLElement): string {
  const lines: string[] = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const type = (el.dataset.type as BlockType) || "p";
      lines.push(prefixFor(type) + inlineToMd(el));
    } else if (node.nodeType === Node.TEXT_NODE) {
      lines.push(node.nodeValue ?? "");
    }
  });
  return lines.join("\n");
}

function makeBlock(type: BlockType, html?: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "nb";
  div.dataset.type = type;
  if (html) div.innerHTML = html;
  else div.appendChild(document.createElement("br"));
  return div;
}

/* ── component ─────────────────────────────────────────────────────────── */

export function RichNoteEditor({
  value,
  onChange,
  onGenerate,
}: {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeMark, setActiveMark] = useState<NoteMarkKey | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const activeMarkRef = useRef<NoteMarkKey | null>(null);
  activeMarkRef.current = activeMark;

  // Build the DOM once per note (parent remounts this via key on note change).
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = "";
    const lines = value.length ? value.split(/\r?\n/) : [""];
    for (const line of lines) {
      const { type, html } = lineToBlock(line);
      root.appendChild(makeBlock(type, html || undefined));
    }
    setIsEmpty(value.trim() === "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const root = ref.current;
    if (!root) return;
    setIsEmpty(root.textContent?.trim() === "");
    onChange(serialize(root));
  };

  // Keep every direct child a valid block; wrap any stray nodes the browser adds.
  const normalize = () => {
    const root = ref.current;
    if (!root) return;
    if (root.childNodes.length === 0) root.appendChild(makeBlock("p"));
    Array.from(root.childNodes).forEach((ch) => {
      if (ch.nodeType === Node.TEXT_NODE) {
        const block = makeBlock("p");
        root.replaceChild(block, ch);
        block.insertBefore(ch, block.firstChild);
      } else if (ch.nodeType === Node.ELEMENT_NODE) {
        const el = ch as HTMLElement;
        if (!el.classList.contains("nb")) el.classList.add("nb");
        if (!el.dataset.type) el.dataset.type = "p";
      }
    });
  };

  const onInput = () => { normalize(); emit(); };

  const currentBlock = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !ref.current) return null;
    let n: Node | null = sel.anchorNode;
    while (n && n.parentNode !== ref.current) n = n.parentNode;
    return (n as HTMLElement) ?? null;
  };

  const blocksInSelection = (): HTMLElement[] => {
    const root = ref.current;
    const sel = window.getSelection();
    if (!root || !sel || !sel.rangeCount) return [];
    const range = sel.getRangeAt(0);
    return (Array.from(root.children) as HTMLElement[]).filter((b) => range.intersectsNode(b));
  };

  const focusBack = () => ref.current?.focus();

  // Headings: toggle the block type on the selected block(s).
  const setHeading = (type: "h1" | "h2" | "h3") => {
    const sel = window.getSelection();
    const blocks = sel && !sel.isCollapsed ? blocksInSelection() : [currentBlock()].filter(Boolean) as HTMLElement[];
    if (blocks.length === 0) return;
    const allSame = blocks.every((b) => b.dataset.type === type);
    blocks.forEach((b) => { b.dataset.type = allSame ? "p" : type; });
    focusBack();
    emit();
  };

  // Písma: with a selection, colour those blocks; with no selection, toggle a
  // persistent writing mode so new lines keep the mark until it's turned off.
  const applyMark = (key: NoteMarkKey) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      blocksInSelection().forEach((b) => { b.dataset.type = key; });
      emit();
      return;
    }
    const turningOff = activeMark === key;
    setActiveMark(turningOff ? null : key);
    const b = currentBlock();
    if (b) b.dataset.type = turningOff ? "p" : key;
    focusBack();
    emit();
  };

  const execInline = (cmd: "bold" | "italic") => {
    document.execCommand(cmd);
    focusBack();
    emit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === "b") { e.preventDefault(); execInline("bold"); return; }
    if (meta && e.key.toLowerCase() === "i") { e.preventDefault(); execInline("italic"); return; }
    if (e.key === "Escape" && activeMark) { setActiveMark(null); return; }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const root = ref.current;
      const sel = window.getSelection();
      if (!root || !sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      let block: Node | null = range.startContainer;
      while (block && block.parentNode !== root) block = block.parentNode;
      if (!block) return;

      // Move everything after the caret into a fresh block.
      const after = range.cloneRange();
      after.selectNodeContents(block as Node);
      after.setStart(range.endContainer, range.endOffset);
      const frag = after.extractContents();

      const newType: BlockType = activeMarkRef.current ?? "p";
      const newBlock = makeBlock(newType);
      if (frag.textContent && frag.textContent.length > 0) {
        newBlock.innerHTML = "";
        newBlock.appendChild(frag);
      }
      root.insertBefore(newBlock, (block as HTMLElement).nextSibling);
      if (!(block as HTMLElement).hasChildNodes()) (block as HTMLElement).appendChild(document.createElement("br"));

      const r = document.createRange();
      r.setStart(newBlock, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      emit();
    }
  };

  const activeUi = activeMark ? MARK_UI[activeMark] : null;
  const activeLabel = activeMark ? NOTE_MARKS.find((m) => m.key === activeMark)?.label : "";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <style>{STYLES}</style>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 sm:px-3 py-1.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}>
        {([
          { icon: Heading1, fn: () => setHeading("h1"), title: "Nadpis" },
          { icon: Heading2, fn: () => setHeading("h2"), title: "Podnadpis" },
          { icon: Heading3, fn: () => setHeading("h3"), title: "Název" },
        ] as const).map(({ icon: Icon, fn, title }, i) => (
          <button key={i} onMouseDown={(e) => { e.preventDefault(); fn(); }} title={title}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-2)" }}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <span className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />
        {([
          { icon: Bold, fn: () => execInline("bold"), title: "Tučně (⌘B)" },
          { icon: Italic, fn: () => execInline("italic"), title: "Kurzíva (⌘I)" },
        ] as const).map(({ icon: Icon, fn, title }, i) => (
          <button key={i} onMouseDown={(e) => { e.preventDefault(); fn(); }} title={title}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-2)" }}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <span className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />
        {NOTE_MARKS.map((m) => {
          const ui = MARK_UI[m.key];
          const Icon = ui.icon;
          const on = activeMark === m.key;
          return (
            <button
              key={m.key}
              onMouseDown={(e) => { e.preventDefault(); applyMark(m.key); }}
              title={`${m.label} — zapni a piš, nebo označ text a klikni`}
              className="h-8 px-2 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={on ? { background: ui.color, color: "#fff" } : { color: ui.color, background: `${ui.color}14` }}
            >
              <Icon className="w-3.5 h-3.5" /> <span className="hidden md:inline">{ui.short}</span>
            </button>
          );
        })}

        <div className="flex items-center ml-auto">
          <button
            onMouseDown={(e) => { e.preventDefault(); onGenerate(); }}
            title="Vytvořit úkoly z poznámky"
            className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--accent)" }}
          >
            <ListTree className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Generovat úkoly</span>
          </button>
        </div>
      </div>

      {/* Editor surface */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-4">
        {activeUi && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold w-fit mb-3"
            style={{ color: activeUi.color, background: `${activeUi.color}14` }}>
            <activeUi.icon className="w-3.5 h-3.5" />
            Píšeš: {activeLabel}
            <button onMouseDown={(e) => { e.preventDefault(); setActiveMark(null); focusBack(); }}
              className="ml-1 opacity-70 hover:opacity-100" title="Vypnout (Esc)">✕</button>
          </div>
        )}
        <div className="relative">
          {isEmpty && (
            <div className="absolute top-0 left-0 pointer-events-none text-[15px]" style={{ color: "var(--text-3)" }}>
              Začni psát… Zapni klientské / projektové / úkolové písmo a piš úkoly rovnou.
            </div>
          )}
          <div
            ref={ref}
            className="rich-note text-[15px] leading-[1.75] min-h-[400px]"
            style={{ color: "var(--text-2)" }}
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.rich-note { outline: none; }
.rich-note .nb { margin: 2px 0; border-radius: 8px; min-height: 1.75em; }
.rich-note .nb[data-type="h1"] { font-size: 26px; font-weight: 800; margin: 10px 0 4px; color: var(--text-1); }
.rich-note .nb[data-type="h2"] { font-size: 20px; font-weight: 700; margin: 8px 0 3px; color: var(--text-1); }
.rich-note .nb[data-type="h3"] { font-size: 16px; font-weight: 600; margin: 6px 0 2px; color: var(--text-1); }
.rich-note .nb[data-type="client"]  { background: #ea580c14; color: #ea580c; font-weight: 700; padding: 3px 10px; border-left: 3px solid #ea580c; }
.rich-note .nb[data-type="project"] { background: #7c3aed14; color: #7c3aed; font-weight: 600; padding: 3px 10px; margin-left: 18px; border-left: 3px solid #7c3aed; }
.rich-note .nb[data-type="task"]    { background: #16a34a14; color: #16a34a; font-weight: 500; padding: 3px 10px; margin-left: 36px; border-left: 3px solid #16a34a; }
`;
