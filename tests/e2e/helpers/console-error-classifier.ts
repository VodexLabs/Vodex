/** Classify console errors — only allow explicitly harmless dev-only warnings. */

const ALLOWED_CONSOLE_PATTERNS: Array<{ id: string; test: (msg: string) => boolean }> = [
  {
    id: "react_submit_button_hydration_attrs",
    test: (msg) =>
      msg.includes("hydration") &&
      msg.includes("data-has-text") &&
      msg.includes("create-submit-button"),
  },
  {
    id: "composer_can_enqueue_build_hydration",
    test: (msg) =>
      msg.includes("hydration") &&
      msg.includes("data-can-enqueue-build") &&
      msg.includes("create-composer-form"),
  },
  {
    id: "workspace_composer_submit_hydration",
    test: (msg) =>
      msg.includes("hydration") &&
      (msg.includes("workspace-composer-submit") || msg.includes("data-has-text")),
  },
  {
    id: "workspace_composer_queue_attrs_hydration",
    test: (msg) =>
      msg.includes("hydration") &&
      (msg.includes("data-queue-ready") || msg.includes("data-queue-count")),
  },
  {
    id: "dev_resource_load_failed",
    test: (msg) =>
      /failed to load resource/i.test(msg) &&
      /500|502|503/i.test(msg),
  },
];

export function classifyConsoleErrors(messages: string[]): {
  unclassified: string[];
  allowed: Array<{ id: string; message: string }>;
} {
  const unclassified: string[] = [];
  const allowed: Array<{ id: string; message: string }> = [];

  for (const msg of messages) {
    const match = ALLOWED_CONSOLE_PATTERNS.find((p) => p.test(msg));
    if (match) allowed.push({ id: match.id, message: msg.slice(0, 200) });
    else unclassified.push(msg);
  }

  return { unclassified, allowed };
}
