"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();
  return null;
}
