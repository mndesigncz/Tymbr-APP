"use client";

import { useEffect, useRef, useState } from "react";
import {
  Heading1, Heading2, Heading3, Bold, Italic,
  Building2, FolderKanban, CheckSquare, ListTree,
} from "lucide-react";
import { NOTE_MARKS, WORD_TO_KEY, KEY_TO_WORD, type NoteMarkKey } from "@/lib/noteTasks";

// A lightweight WYSIWYG editor for notes.
//
// Blocks are lines with a type (paragraph or heading). The three "písma"
// (klient/projekt/úkol) are INLINE marks applied to spans of text — like a
// coloured highlighter. Selecting text and clicking a písmo marks just that
// selection; toggling a písmo with no selection arms a writing mode so the next
// text you type is marked, until you turn it off — leaving exactly the marked
// span behind. The @klient{…}/@projekt{…}/@úkol{…} tokens are never shown;
// content round-trips to a stored string the rest of the app understands.

type BlockType = "p" | "h1" | "h2" | "h3";

const ZWSP = "​";

const MARK_UI: Record<NoteMarkKey, { icon: typeof Building2; color: string; short: string }> = {
  client: { icon: Building2, color: "#ea580c", short: "Klient" },
  project: { icon: FolderKanban, color: "#7c3aed", short: "Projekt" },
  task: { icon: CheckSquare, color: "#16a34a", short: "Úkol" },
};

/* ── (de)serialisation between the stored string and the editor DOM ─────── */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convert **bold** / *italic* in an already HTML-escaped string.
function emph(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Build a block's inline HTML from stored markdown+token text.
function inlineToHtml(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/@(klient|projekt|úkol)\{([^}]*)\}/g, (_m, w: string, inner: string) =>
    `<span data-mark="${WORD_TO_KEY[w]}">${emph(inner)}</span>`);
  return emph(html);
}

function lineToBlock(line: string): { type: BlockType; html: string } {
  const h = line.match(/^(#{1,3})\s+(.*)$/);
  if (h) return { type: ("h" + h[1].length) as BlockType, html: inlineToHtml(h[2]) };
  return { type: "p", html: inlineToHtml(line) };
}

function prefixFor(type: BlockType): string {
  return type === "h1" ? "# " : type === "h2" ? "## " : type === "h3" ? "### " : "";
}

// Convert a block's inline DOM back to markdown + tokens.
function inlineToMd(node: Node): string {
  let out = "";
  node.childNodes.forEach((ch) => {
    if (ch.nodeType === Node.TEXT_NODE) {
      out += (ch.nodeValue ?? "").replace(/​/g, "");
    } else if (ch.nodeName === "BR") {
      // ignore filler line-breaks
    } else if (ch.nodeType === Node.ELEMENT_NODE) {
      const el = ch as HTMLElement;
      const mark = el.dataset.mark as NoteMarkKey | undefined;
      if (mark && KEY_TO_WORD[mark]) {
        out += `@${KEY_TO_WORD[mark]}{${inlineToMd(el)}}`;
        return;
      }
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
      lines.push((node.nodeValue ?? "").replace(/​/g, ""));
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
    setIsEmpty(root.textContent?.replace(/​/g, "").trim() === "");
    onChange(serialize(root));
  };

  const focusBack = () => ref.current?.focus();

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

  const onInput = () => { normalize(); cleanEmptyMarks(); emit(); };

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

  // The mark span the caret currently sits in (if any).
  const caretMarkSpan = (): HTMLElement | null => {
    const sel = window.getSelection();
    let n: Node | null = sel?.anchorNode ?? null;
    while (n && n !== ref.current) {
      if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).dataset.mark) return n as HTMLElement;
      n = n.parentNode;
    }
    return null;
  };

  const unwrap = (el: HTMLElement) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  };

  // Remove any empty mark spans left behind (e.g. a mode armed but never typed),
  // except the one the caret is actively writing in.
  const cleanEmptyMarks = () => {
    const root = ref.current;
    if (!root) return;
    const keep = activeMarkRef.current ? caretMarkSpan() : null;
    root.querySelectorAll<HTMLElement>("span[data-mark]").forEach((sp) => {
      if (sp === keep) return;
      if ((sp.textContent ?? "").replace(/​/g, "") === "") unwrap(sp);
    });
  };

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

  // End the armed writing mode. Placing the caret merely "after" the span makes
  // the browser keep typing inside it (caret absorption), so we insert a plain
  // text-node boundary (a zero-width space) right after the span and drop the
  // caret INSIDE it — new typing then lands outside any mark. An empty sentinel
  // (mode armed but nothing typed) is removed entirely.
  const endMode = () => {
    const span = caretMarkSpan();
    if (span && span.parentNode) {
      const empty = (span.textContent ?? "").replace(/​/g, "") === "";
      const boundary = document.createTextNode(ZWSP);
      span.parentNode.insertBefore(boundary, span.nextSibling);
      if (empty) span.parentNode.removeChild(span);
      const r = document.createRange();
      r.setStart(boundary, 1);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    setActiveMark(null);
    emit();
  };

  // Arm a writing mode at a collapsed caret by inserting a sentinel mark span.
  const startMode = (key: NoteMarkKey) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.dataset.mark = key;
    span.appendChild(document.createTextNode(ZWSP));
    range.insertNode(span);
    const r = document.createRange();
    r.setStart(span.firstChild!, 1); // after the ZWSP → typing extends the span
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    setActiveMark(key);
  };

  // Wrap the current selection in an inline mark (toggling off if already marked).
  const wrapSelection = (key: NoteMarkKey) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // If the selection sits entirely within a mark span of the same type, unwrap it.
    const existing = caretMarkSpan();
    if (existing && existing.dataset.mark === key && range.toString() === (existing.textContent ?? "").replace(/​/g, "")) {
      unwrap(existing);
      focusBack();
      emit();
      return;
    }

    const span = document.createElement("span");
    span.dataset.mark = key;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    // Flatten any nested marks so only the new one applies.
    span.querySelectorAll<HTMLElement>("span[data-mark]").forEach((inner) => { if (inner !== span) unwrap(inner); });

    const r = document.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
    focusBack();
    emit();
  };

  // Toolbar handler for the three písma.
  const onMark = (key: NoteMarkKey) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      wrapSelection(key);
      return;
    }
    // Collapsed caret → arm / disarm the writing mode. Nothing gets marked yet.
    if (activeMark === key) { endMode(); return; }
    if (activeMark) endMode();
    startMode(key);
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
    if (e.key === "Escape" && activeMark) { endMode(); return; }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const root = ref.current;
      const sel = window.getSelection();
      if (!root || !sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      let block: Node | null = range.startContainer;
      while (block && block.parentNode !== root) block = block.parentNode;
      if (!block) return;

      // Move everything after the caret into a fresh paragraph block.
      const after = range.cloneRange();
      after.selectNodeContents(block as Node);
      after.setStart(range.endContainer, range.endOffset);
      const frag = after.extractContents();

      const newBlock = makeBlock("p");
      if (frag.textContent && frag.textContent.replace(/​/g, "").length > 0) {
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

      // Continue the armed writing mode on the new line.
      if (activeMarkRef.current) startMode(activeMarkRef.current);
      emit();
    }
  };

  // If the caret leaves the active sentinel span, drop the mode indicator.
  const syncMode = () => {
    if (!activeMarkRef.current) return;
    const span = caretMarkSpan();
    if (!span || span.dataset.mark !== activeMarkRef.current) setActiveMark(null);
  };

  const onBlur = () => { cleanEmptyMarks(); emit(); };

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
              onMouseDown={(e) => { e.preventDefault(); onMark(m.key); }}
              title={`${m.label} — označ text a klikni, nebo zapni a piš`}
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
            <button onMouseDown={(e) => { e.preventDefault(); endMode(); focusBack(); }}
              className="ml-1 opacity-70 hover:opacity-100" title="Vypnout (Esc)">✕</button>
          </div>
        )}
        <div className="relative">
          {isEmpty && (
            <div className="absolute top-0 left-0 pointer-events-none text-[15px]" style={{ color: "var(--text-3)" }}>
              Začni psát… Označ text a klikni na Klient / Projekt / Úkol, nebo písmo zapni a piš.
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
            onKeyUp={syncMode}
            onMouseUp={syncMode}
            onBlur={onBlur}
          />
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.rich-note { outline: none; }
.rich-note .nb { margin: 2px 0; min-height: 1.75em; }
.rich-note .nb[data-type="h1"] { font-size: 26px; font-weight: 800; margin: 10px 0 4px; color: var(--text-1); }
.rich-note .nb[data-type="h2"] { font-size: 20px; font-weight: 700; margin: 8px 0 3px; color: var(--text-1); }
.rich-note .nb[data-type="h3"] { font-size: 16px; font-weight: 600; margin: 6px 0 2px; color: var(--text-1); }
.rich-note span[data-mark] { border-radius: 4px; padding: 0 3px; font-weight: 600; }
.rich-note span[data-mark="client"]  { background: #ea580c26; color: #ea580c; }
.rich-note span[data-mark="project"] { background: #7c3aed26; color: #7c3aed; }
.rich-note span[data-mark="task"]    { background: #16a34a26; color: #16a34a; }
`;
