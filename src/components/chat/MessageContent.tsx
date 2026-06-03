"use client";

import { Fragment } from "react";
import { ChatTaskChip } from "./ChatTaskChip";
import type { Task } from "@/types";

const TASK_MARKER = /\[\[task:([a-zA-Z0-9_-]+)\]\]/g;

export function hasTaskMarkers(content: string): boolean {
  TASK_MARKER.lastIndex = 0;
  return TASK_MARKER.test(content);
}

// Renders a chat message body, replacing [[task:ID]] markers with live task cards.
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

  TASK_MARKER.lastIndex = 0;
  while ((match = TASK_MARKER.exec(content)) !== null) {
    const [full, taskId] = match;
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      parts.push(<Fragment key={key++}>{text}</Fragment>);
    }
    parts.push(<ChatTaskChip key={key++} task={tasksById[taskId] ?? null} />);
    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) {
    parts.push(<Fragment key={key++}>{content.slice(lastIndex)}</Fragment>);
  }

  return (
    <p
      className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words"
      style={textColor ? { color: textColor } : undefined}
    >
      {parts}
    </p>
  );
}
