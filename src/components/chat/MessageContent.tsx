"use client";

import { Fragment } from "react";
import { ChatTaskChip } from "./ChatTaskChip";
import { ChatUserChip } from "./ChatUserChip";
import { ChatFileChip } from "./ChatFileChip";
import type { Task } from "@/types";

// Matches [[task:id]], [[user:id]], [[file:id]]
const MARKER = /\[\[(task|user|file):([a-zA-Z0-9_-]+)\]\]/g;

export function hasTaskMarkers(content: string): boolean {
  MARKER.lastIndex = 0;
  return MARKER.test(content);
}

export function MessageContent({
  content,
  tasksById,
  textColor,
}: {
  content: string;
  tasksById: Record<string, Task>;
  textColor?: string;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MARKER.lastIndex = 0;
  while ((match = MARKER.exec(content)) !== null) {
    const [full, type, id] = match;
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{content.slice(lastIndex, match.index)}</Fragment>);
    }
    if (type === "task") {
      parts.push(<ChatTaskChip key={key++} task={tasksById[id]} taskId={id} />);
    } else if (type === "user") {
      parts.push(<ChatUserChip key={key++} userId={id} />);
    } else if (type === "file") {
      parts.push(<ChatFileChip key={key++} fileId={id} />);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) {
    parts.push(<Fragment key={key++}>{content.slice(lastIndex)}</Fragment>);
  }

  return (
    <p
      className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
      style={{ overflowWrap: "anywhere", wordBreak: "break-word", ...(textColor ? { color: textColor } : {}) }}
    >
      {parts}
    </p>
  );
}
