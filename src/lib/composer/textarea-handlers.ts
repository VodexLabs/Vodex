import type * as React from "react";

/** Inserts clipboard text into a controlled composer textarea (works when default paste is blocked). */
export function applyComposerPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
) {
  const pasted = e.clipboardData.getData("text/plain");
  if (!pasted) return;
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + pasted + value.slice(end);
  setValue(next);
  const caret = start + pasted.length;
  requestAnimationFrame(() => {
    el.selectionStart = caret;
    el.selectionEnd = caret;
  });
}
