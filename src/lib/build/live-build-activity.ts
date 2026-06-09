/** Rotating status lines during silent model-generation gaps. */
export function modelStageActivityMessages(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const systems: string[] = [];
  if (/workout|fitness|gym|streak|pr\b|personal record/i.test(p)) {
    systems.push("workout streak engine", "PR tracker", "progress gallery", "achievement badges");
  }
  if (/dashboard|analytics|insight/i.test(p)) systems.push("analytics dashboard", "KPI cards");
  if (/auth|login|signup|user/i.test(p)) systems.push("auth flows", "profile settings");
  if (/payment|stripe|checkout|subscription/i.test(p)) systems.push("billing", "checkout");
  if (systems.length === 0) {
    systems.push("core screens", "navigation", "data model", "settings");
  }

  const intro = `I'll turn this into a production app with these systems: ${systems.slice(0, 6).join(", ")}. I'll map the data first, then generate the main screens and wire navigation.`;

  return [
    intro,
    "Designing information architecture for primary screens",
    "Planning data model and entity relationships",
    "Preparing route map and navigation shell",
    "Asking the model for core pages and components",
    "Waiting for model response",
    "Parsing returned files and validating structure",
  ];
}

export function pickLiveActivityLine(messages: string[], elapsedMs: number): string {
  if (messages.length === 0) return "Working on your app…";
  const idx = Math.min(messages.length - 1, Math.floor(elapsedMs / 2200));
  return messages[idx]!;
}

export function retryReasonFromMessage(msg: string): string | null {
  if (/first pass.*thin|only \d+ meaningful routes/i.test(msg)) {
    return "First pass returned a thin route set — requesting full dashboard, detail pages, settings, and analytics…";
  }
  if (/compact route retry/i.test(msg)) {
    return "Compact route retry — generating core pages with a focused route set…";
  }
  return null;
}
