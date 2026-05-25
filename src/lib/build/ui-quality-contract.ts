/**
 * Strict UI quality contract for DreamOS86 generated apps.
 * Preview is not ready below PREVIEW_READY_MIN_SCORE.
 */

export const PREVIEW_READY_MIN_SCORE = 85;

export const UI_QUALITY_CONTRACT_RULES = [
  "App shell exists (layout with nav or header)",
  "Navigation exists when more than one route is planned",
  "Home/dashboard route is visually rich — not a lone headline",
  "At least 3 meaningful sections on the primary route",
  "At least one realistic table, list, or card grid where relevant",
  "At least one empty, loading, or error state on data views",
  "App-specific terminology from the archetype",
  "No TODO, FIXME, coming soon, or lorem ipsum",
  "No placeholder-only screens",
  "No generic Welcome + 3 plain cards layout",
  "No framework names in user-visible UI copy",
  "No raw unstyled HTML defaults for primary layout",
  "Mobile-responsive layout (sm/md breakpoints)",
] as const;

export const USER_FACING_UI_BANNED = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /coming soon/i,
  /lorem ipsum/i,
  /under construction/i,
  /not implemented yet/i,
  /placeholder only/i,
  /this is a demo/i,
  /sample data only/i,
  /\bNext\.?js\b/i,
  /\bVite\b/i,
  /\bReact\b(?![\w-]*node)/i,
  /\bTailwind\b/i,
  /\bTypeScript\b/i,
  /powered by next/i,
  /built with react/i,
] as const;

export const BASIC_UI_FAILURE_PATTERNS = {
  welcomeOnly: /welcome to\s+[\w\s]{2,40}/i,
  threePlainCards:
    /(?:card|rounded)[\s\S]{0,200}(?:card|rounded)[\s\S]{0,200}(?:card|rounded)/i,
  noNavigation: (content: string) =>
    !/nav|sidebar|menu|tab|Link href|href=["']\/[a-z]/i.test(content),
  shallowHome: (content: string) => {
    const sections =
      (content.match(/<section|className="[^"]*(?:grid|flex|space-y)/gi) ?? []).length +
      (content.match(/metric|dashboard|table|thead|chart|filter|search/i) ?? []).length;
    return sections < 3;
  },
} as const;

export function formatQualityContractForPrompt(): string {
  return [
    "UI QUALITY CONTRACT (mandatory — score must be ≥ 85 for preview ready):",
    ...UI_QUALITY_CONTRACT_RULES.map((r) => `- ${r}`),
    "- You are shipping the first production-quality version, not a prototype demo.",
  ].join("\n");
}
