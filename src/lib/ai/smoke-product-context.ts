/**
 * Condensed user-safe facts for admin smoke — same product truth as chat, fewer tokens.
 */
export function getSmokeProductSystemContext(): string {
  return [
    "Vodex product facts (authoritative for this test):",
    "- Vodex is an AI-native app builder platform.",
    "- Users create apps from plain language.",
    "- Core surfaces: Create flow, Builder, Preview, Publish, ZIP Import, AI Chat.",
    "- Credits are the user-facing unit for completed AI work.",
    "- Do not claim fake deployments or unsupported actions.",
    "- Vodex is NOT a hobby x86 OS and NOT a fictional game OS.",
    "Answer using only these facts.",
  ].join("\n");
}

/** Score whether a smoke response correctly describes Vodex as the product. */
export function scoreProductAwareDreamOSAnswer(text: string | null): {
  correct: boolean;
  note: string;
} {
  if (!text?.trim()) return { correct: false, note: "empty response" };

  const lower = text.toLowerCase();
  const bad = [
    /don't know|do not know|no information|not in my training|unable to/i,
    /hobbyist|hobby os|16-bit|8086|8088|assembly language|dosbox|retrocomputing/i,
    /goodbye volcano|fictional operating system featured in the game/i,
    /emulate.*dos|classic dos environments/i,
    /x86 architecture.*(learning|educational|experimental)/i,
  ];
  for (const re of bad) {
    if (re.test(lower)) return { correct: false, note: `incorrect: matched ${re.source}` };
  }

  const goodHits: string[] = [];
  if (/ai-native|ai native|ai-powered|ai powered/.test(lower)) goodHits.push("ai-native");
  if (/app builder|build apps|building apps|build web apps/.test(lower)) goodHits.push("app builder");
  if (/plain language|natural language|describe.*apps/.test(lower)) goodHits.push("plain language");
  if (/create|builder|preview|publish|zip import|ai chat/.test(lower)) goodHits.push("product surfaces");

  if (goodHits.length >= 2) {
    return { correct: true, note: `product-aware pass (${goodHits.join(", ")})` };
  }
  if (/vodex/.test(lower) && /platform|apps|software|builder/.test(lower)) {
    return { correct: true, note: "product-aware pass (platform context)" };
  }

  return {
    correct: false,
    note: goodHits.length ? `weak product context (${goodHits.join(", ")})` : "missing product facts",
  };
}
