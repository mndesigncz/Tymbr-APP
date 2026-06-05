"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs, textareas, contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      // Ignore when modifier keys are held (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          router.push("/tasks/new");
          break;
        case "k":
        case "K":
          e.preventDefault();
          // Focus the first search input on the page, or go to tasks with search focused
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="ledat"], input[placeholder*="Hledat"]');
          if (searchInput) {
            searchInput.focus();
          } else {
            router.push("/tasks");
          }
          break;
        case "d":
        case "D":
          e.preventDefault();
          router.push("/dashboard");
          break;
        case "t":
        case "T":
          e.preventDefault();
          router.push("/tasks");
          break;
        case "c":
        case "C":
          e.preventDefault();
          router.push("/chat");
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("tymbr:shortcuts-help"));
          break;
        case "Escape":
          window.dispatchEvent(new CustomEvent("tymbr:escape"));
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
}
