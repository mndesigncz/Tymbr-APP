"use client";

import React from "react";
import { Building2, FolderKanban, CheckSquare } from "lucide-react";
import { MARK_LINE_RE } from "@/lib/noteTasks";

// Visual treatment for each semantic marker line (klient / projekt / úkol).
const MARK_STYLES: Record<string, { color: string; indent: string; Icon: typeof Building2; label: string }> = {
  klient:  { color: "#ea580c", indent: "pl-0",  Icon: Building2,    label: "Klient" },
  projekt: { color: "#7c3aed", indent: "pl-5",  Icon: FolderKanban, label: "Projekt" },
  "úkol":  { color: "#16a34a", indent: "pl-10", Icon: CheckSquare,  label: "Úkol" },
};

// A tiny, dependency-free markdown renderer tuned for the notes editor.
// Supports: # / ## / ### headings, unordered (-, *, +) and ordered lists,
// > blockquotes, and inline **bold**, *italic*, `code`, ~~strike~~.
// Deliberately small — notes are short-form; we don't need full CommonMark.

/** Render inline markdown (bold/italic/code/strike) inside a line. */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Ordered by precedence; each regex captures the inner text.
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`(.+?)`|\*(.+?)\*|_(.+?)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined || m[3] !== undefined) {
      nodes.push(<strong key={key}>{m[2] ?? m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<s key={key}>{m[4]}</s>);
    } else if (m[5] !== undefined) {
      nodes.push(
        <code key={key} className="px-1 py-0.5 rounded text-[0.9em]"
          style={{ background: "var(--bg-subtle)", fontFamily: "var(--font-mono, monospace)" }}>
          {m[5]}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{m[6] ?? m[7]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownView({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, idx) => (
      <li key={idx} className="leading-[1.7]">{renderInline(it, `li-${key}-${idx}`)}</li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="list-decimal pl-6 my-2 space-y-1" style={{ color: "var(--text-2)" }}>{items}</ol>
      ) : (
        <ul key={key++} className="list-disc pl-6 my-2 space-y-1" style={{ color: "var(--text-2)" }}>{items}</ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const mark = line.match(MARK_LINE_RE);
    if (mark) {
      flushList();
      const st = MARK_STYLES[mark[1]];
      const text = (mark[2] || "").trim();
      blocks.push(
        <div key={key++} className={`flex items-center gap-2 my-1 ${st.indent}`}>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide flex-shrink-0"
            style={{ color: st.color, background: `${st.color}18` }}
          >
            <st.Icon className="w-3 h-3" /> {st.label}
          </span>
          <span className="text-[14.5px] font-semibold" style={{ color: st.color }}>
            {text ? renderInline(text, `mk-${key}`) : <span className="italic opacity-60">(prázdné)</span>}
          </span>
        </div>
      );
      continue;
    }
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (h3) {
      flushList();
      blocks.push(<h3 key={key++} className="text-[16px] font-semibold mt-3 mb-1" style={{ color: "var(--text-1)" }}>{renderInline(h3[1], `h3-${key}`)}</h3>);
    } else if (h2) {
      flushList();
      blocks.push(<h2 key={key++} className="text-[20px] font-bold mt-4 mb-1.5" style={{ color: "var(--text-1)" }}>{renderInline(h2[1], `h2-${key}`)}</h2>);
    } else if (h1) {
      flushList();
      blocks.push(<h1 key={key++} className="text-[26px] font-extrabold mt-4 mb-2" style={{ color: "var(--text-1)" }}>{renderInline(h1[1], `h1-${key}`)}</h1>);
    } else if (ul) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
    } else if (ol) {
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
    } else if (quote) {
      flushList();
      blocks.push(
        <blockquote key={key++} className="border-l-2 pl-3 my-2 italic" style={{ borderColor: "var(--accent)", color: "var(--text-2)" }}>
          {renderInline(quote[1], `q-${key}`)}
        </blockquote>
      );
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={key++} className="text-[15px] leading-[1.75] my-1.5" style={{ color: "var(--text-2)" }}>{renderInline(line, `p-${key}`)}</p>);
    }
  }
  flushList();

  if (blocks.length === 0) {
    return <p className="text-[14px] italic" style={{ color: "var(--text-3)" }}>Prázdná poznámka</p>;
  }
  return <div>{blocks}</div>;
}
