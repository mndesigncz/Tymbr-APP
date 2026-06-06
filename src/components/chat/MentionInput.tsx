"use client";

import { useRef, useImperativeHandle, forwardRef, useEffect } from "react";

export interface MentionInputHandle {
  clear: () => void;
  focus: () => void;
  insertMention: (type: "task" | "user" | "file", id: string, label: string) => void;
  serialize: () => string;
  isEmpty: () => boolean;
}

interface Props {
  placeholder: string;
  onQueryChange: (query: string | null) => void;
  onHasContentChange: (hasContent: boolean) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const MentionInput = forwardRef<MentionInputHandle, Props>(
  ({ placeholder, onQueryChange, onHasContentChange, onSubmit, disabled }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Serialize contenteditable DOM → plain string with [[type:id]] markers
    const serialize = (): string => {
      const el = editorRef.current;
      if (!el) return "";
      let result = "";
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent ?? "";
        } else if (node instanceof HTMLElement) {
          const mType = node.dataset.mentionType;
          const mId = node.dataset.mentionId;
          if (mId && mType) {
            result += `[[${mType}:${mId}]]`;
          } else if (node.tagName === "BR") {
            result += "\n";
          } else if (node.tagName === "DIV") {
            if (result.length > 0) result += "\n";
            node.childNodes.forEach(walk);
          } else {
            node.childNodes.forEach(walk);
          }
        }
      };
      el.childNodes.forEach(walk);
      return result;
    };

    // Get the @query before the current cursor (in the nearest text node)
    const getMentionState = (): {
      query: string;
      textNode: Text;
      startOffset: number;
      endOffset: number;
    } | null => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      if (range.endContainer.nodeType !== Node.TEXT_NODE) return null;
      const textNode = range.endContainer as Text;
      const offset = range.endOffset;
      const textBefore = (textNode.textContent ?? "").slice(0, offset);
      const match = /@([^\s@]*)$/.exec(textBefore);
      if (!match) return null;
      return { query: match[1], textNode, startOffset: match.index, endOffset: offset };
    };

    const insertMention = (type: "task" | "user" | "file", id: string, label: string) => {
      const el = editorRef.current;
      if (!el) return;

      const state = getMentionState();

      const chip = document.createElement("span");
      chip.contentEditable = "false";
      chip.dataset.mentionType = type;
      chip.dataset.mentionId = id;
      chip.textContent = `@${label}`;
      chip.style.cssText =
        "display:inline;background:var(--accent-soft);color:var(--accent);border-radius:6px;padding:1px 6px;font-weight:600;font-size:13px;cursor:default;user-select:none;";

      const space = document.createTextNode(" ");

      if (state) {
        const { textNode, startOffset, endOffset } = state;
        const parent = textNode.parentNode!;
        const before = textNode.textContent!.slice(0, startOffset);
        const after = textNode.textContent!.slice(endOffset);
        textNode.textContent = before;
        parent.insertBefore(chip, textNode.nextSibling);
        parent.insertBefore(space, chip.nextSibling);
        if (after) parent.insertBefore(document.createTextNode(after), space.nextSibling);
      } else {
        el.appendChild(chip);
        el.appendChild(space);
      }

      // Move cursor after the trailing space
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(newRange);

      el.focus();
      onQueryChange(null);
      onHasContentChange(serialize().trim().length > 0);
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (editorRef.current) editorRef.current.innerHTML = "";
        onHasContentChange(false);
      },
      focus: () => editorRef.current?.focus(),
      serialize,
      insertMention,
      isEmpty: () => serialize().trim().length === 0,
    }));

    const handleInput = () => {
      const state = getMentionState();
      onQueryChange(state ? state.query : null);
      onHasContentChange(serialize().trim().length > 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!serialize().trim()) return;
        onSubmit();
      }
    };

    // Prevent pasting HTML — paste as plain text only
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    };

    return (
      <>
        <style>{`
          [data-mention-placeholder]:empty:before {
            content: attr(data-mention-placeholder);
            color: var(--text-3);
            pointer-events: none;
          }
        `}</style>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          data-mention-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="flex-1 min-h-[44px] max-h-32 overflow-y-auto text-[14px] px-4 py-3 rounded-2xl outline-none leading-relaxed"
          style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
        />
      </>
    );
  }
);

MentionInput.displayName = "MentionInput";
