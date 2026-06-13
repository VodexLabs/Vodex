"use client";

import * as React from "react";

/** Smooth character-by-character reveal for assistant narration. */
export function useTypedText(text: string | undefined, opts?: { cps?: number; enabled?: boolean }) {
  const cps = opts?.cps ?? 42;
  const enabled = opts?.enabled !== false;
  const [visible, setVisible] = React.useState("");

  React.useEffect(() => {
    if (!text) {
      setVisible("");
      return;
    }
    if (!enabled) {
      setVisible(text);
      return;
    }
    setVisible("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, Math.max(12, 1000 / cps));
    return () => clearInterval(id);
  }, [text, enabled, cps]);

  return visible;
}
