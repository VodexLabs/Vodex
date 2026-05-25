/**
 * Derive a clean app display name from a user prompt — never use raw prompt text.
 */

const BUILD_PREFIX =
  /^(?:please\s+)?(?:build|create|make|generate|design)\s+(?:me\s+)?(?:a|an|my|the)\s+/i;

const QUESTION_LEAD =
  /^(?:what|why|how|when|where|who|which|can you|could you|tell me|give me|should i|do i)\b/i;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function stripPromptNoise(text: string): string {
  return text
    .replace(BUILD_PREFIX, "")
    .replace(/\?+$/, "")
    .replace(/[.!]+$/, "")
    .trim();
}

const CONCEPT_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /\b(crm|customer relationship)\b/i, name: "CRM Workspace" },
  { re: /\b(e-?commerce|online store|shop)\b/i, name: "Online Store" },
  { re: /\b(booking|appointment|salon|clinic)\b/i, name: "Booking App" },
  { re: /\b(finance|budget|expense|money tracker)\b/i, name: "Finance Tracker" },
  { re: /\b(chatbot|ai assistant|ai chat)\b/i, name: "AI Assistant" },
  { re: /\b(social|community|feed)\b/i, name: "Social App" },
  { re: /\b(portfolio|resume|cv)\b/i, name: "Portfolio" },
  { re: /\b(dashboard|analytics|saas)\b/i, name: "SaaS Dashboard" },
  { re: /\b(habit|fitness|workout|gym)\b/i, name: "Fitness App" },
  { re: /\b(marketplace|listing)\b/i, name: "Marketplace" },
  { re: /\b(landing page|marketing site)\b/i, name: "Landing Page" },
  { re: /\b(helpdesk|support ticket)\b/i, name: "Support Desk" },
  { re: /\b(course|learning|lesson)\b/i, name: "Learning App" },
];

/** Deterministic app name from concept — fallback "Untitled App". */
export function deriveAppNameFromPrompt(prompt: string): string {
  const raw = prompt.trim();
  if (!raw || QUESTION_LEAD.test(raw)) return "Untitled App";

  for (const { re, name } of CONCEPT_PATTERNS) {
    if (re.test(raw)) return name;
  }

  const stripped = stripPromptNoise(raw);
  if (!stripped || stripped.length < 3) return "Untitled App";

  const firstClause = stripped.split(/[,;.\n!?]/)[0]?.trim() ?? stripped;
  const words = firstClause.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled App";

  const capped = titleCase(words.slice(0, 4).join(" "));
  if (capped.length < 3 || capped.length > 48) return "Untitled App";
  if (/^(give|tell|what|how|which|should|can|could)\b/i.test(capped)) return "Untitled App";
  return capped.slice(0, 48);
}
