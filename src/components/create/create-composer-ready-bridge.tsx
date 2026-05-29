"use client";

import * as React from "react";

export type ComposerReadinessReason =
  | "shell_missing"
  | "textarea_missing"
  | "textarea_disabled"
  | "textarea_not_visible"
  | "submit_missing"
  | "debug_attrs_missing"
  | "handlers_not_ready"
  | "ready";

export function evaluateComposerReadiness(): {
  ready: boolean;
  reason: ComposerReadinessReason;
} {
  if (typeof document === "undefined") {
    return { ready: false, reason: "shell_missing" };
  }

  const shell =
    document.querySelector('[data-testid="builder-shell"]:not([data-create-server-shell="true"])') ??
    document.querySelector('[data-testid="create-page-root"]');
  if (!shell) return { ready: false, reason: "shell_missing" };

  const ta =
    document.querySelector(
      '[data-testid="workspace-composer-textarea"], [data-testid="create-prompt-textarea"]',
    ) ??
    document.getElementById("dreamos-composer-prompt");
  if (!(ta instanceof HTMLTextAreaElement)) {
    return { ready: false, reason: "textarea_missing" };
  }

  const rect = ta.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    return { ready: false, reason: "textarea_not_visible" };
  }

  if (ta.disabled || ta.getAttribute("aria-disabled") === "true") {
    return { ready: false, reason: "textarea_disabled" };
  }

  const btn = document.querySelector(
    '[data-testid="workspace-composer-submit"], [data-testid="create-submit-button"]',
  );
  if (!(btn instanceof HTMLButtonElement)) {
    return { ready: false, reason: "submit_missing" };
  }

  for (const attr of [
    "data-disabled-reason",
    "data-dom-len",
    "data-state-len",
    "data-live-len",
  ] as const) {
    if (!btn.hasAttribute(attr)) {
      return { ready: false, reason: "debug_attrs_missing" };
    }
  }

  if (ta.getAttribute("data-composer-handlers") !== "true") {
    return { ready: false, reason: "handlers_not_ready" };
  }

  return { ready: true, reason: "ready" };
}

/**
 * Live DOM probe + sr-only marker for E2E. Mounted outside nested Suspense on /create.
 */
export function CreateComposerReadyBridge() {
  const [state, setState] = React.useState<{ ready: boolean; reason: ComposerReadinessReason }>({
    ready: false,
    reason: "shell_missing",
  });

  React.useEffect(() => {
    const tick = () => {
      const next = evaluateComposerReadiness();
      setState((prev) =>
        prev.ready === next.ready && prev.reason === next.reason ? prev : next,
      );
    };

    tick();
    const interval = window.setInterval(tick, 40);
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("dreamos:composer-sync", tick);

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("dreamos:composer-sync", tick);
    };
  }, []);

  return (
    <div
      data-testid="create-composer-ready"
      data-ready={state.ready ? "true" : "false"}
      data-reason={state.reason}
      className="sr-only"
      aria-hidden
    />
  );
}
