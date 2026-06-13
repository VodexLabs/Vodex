"use client";

import * as React from "react";

const DRAFT_KEY = "vodex:composer-draft";

export function useBuilderOffline() {
  const [online, setOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [reconnecting, setReconnecting] = React.useState(false);

  React.useEffect(() => {
    const onOffline = () => {
      setOnline(false);
      setReconnecting(true);
    };
    const onOnline = () => {
      setOnline(true);
      setReconnecting(false);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return { online, reconnecting, pausedLabel: reconnecting ? "Connection paused — reconnecting…" : null };
}

export function queueComposerDraft(projectId: string | null, text: string) {
  if (typeof window === "undefined" || !text.trim()) return;
  try {
    const key = `${DRAFT_KEY}:${projectId ?? "new"}`;
    window.localStorage.setItem(key, text);
  } catch {
    /* ignore */
  }
}

export function readComposerDraft(projectId: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${DRAFT_KEY}:${projectId ?? "new"}`);
  } catch {
    return null;
  }
}

export function clearComposerDraft(projectId: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${DRAFT_KEY}:${projectId ?? "new"}`);
  } catch {
    /* ignore */
  }
}
