/**
 * Continue-build flow — user-facing staged builder messaging and next actions.
 */
import type { BuildBacklogItem } from "@/lib/build/build-backlog";
import { estimateContinuationCredits } from "@/lib/build/build-backlog";
import type { FirstPassScope } from "@/lib/build/first-pass-scope";
import type { BuildIntakeSummary } from "@/lib/ai/build-intake-types";

export type ContinueBuildAction = {
  id: string;
  label: string;
  prompt: string;
  category?: string;
  estimatedCredits?: number;
};

export type BuildResultSummary = {
  headline: string;
  completedNow: string[];
  queuedNext: string[];
  suggestedActions: ContinueBuildAction[];
  creditsUsedLabel?: string;
};

const ACTION_TEMPLATES: ContinueBuildAction[] = [
  { id: "continue", label: "Continue building", prompt: "Continue building the next highest-value features from the queued backlog." },
  { id: "backend", label: "Add backend", prompt: "Continue with backend — implement data layer and API routes for the core entities.", category: "backend" },
  { id: "auth", label: "Add authentication", prompt: "Add authentication with login, signup, and session handling.", category: "auth" },
  { id: "integrations", label: "Connect integrations", prompt: "Connect the planned third-party integrations.", category: "integration" },
  { id: "polish", label: "Improve UI polish", prompt: "Improve UI polish — animations, spacing, and visual refinement.", category: "polish" },
  { id: "publish", label: "Prepare for publish", prompt: "Prepare this app for publish — fix blockers and production readiness.", category: "deployment" },
];

export function buildSuggestedActions(backlog: BuildBacklogItem[]): ContinueBuildAction[] {
  const categories = new Set(backlog.map((b) => b.category));
  const actions: ContinueBuildAction[] = [ACTION_TEMPLATES[0]!];

  for (const tpl of ACTION_TEMPLATES.slice(1)) {
    if (tpl.category && categories.has(tpl.category as BuildBacklogItem["category"])) {
      const matching = backlog.filter((b) => b.category === tpl.category);
      actions.push({
        ...tpl,
        estimatedCredits: estimateContinuationCredits(matching.slice(0, 3)),
      });
    }
  }

  if (actions.length < 4) {
    actions.push(ACTION_TEMPLATES[4]!, ACTION_TEMPLATES[5]!);
  }

  return actions.slice(0, 6);
}

export function formatBuildResultSummary(input: {
  appName: string;
  scope: FirstPassScope;
  intake: BuildIntakeSummary;
  backlog: BuildBacklogItem[];
  creditsUsed?: number;
  builtScreens?: string[];
}): BuildResultSummary {
  const completedNow = [
    "App shell and navigation",
    "Core screens and main user flow",
    "Design system and polished UI preview",
    "Demo-safe sample data",
    ...(input.builtScreens ?? input.intake.coreScreens.slice(0, 6)).map((s) => `Screen: ${s}`),
    ...input.scope.mustHaveFeatures.slice(0, 6).map((f) => f.slice(0, 80)),
  ].slice(0, 12);

  const queuedNext = input.backlog
    .filter((b) => b.status === "queued")
    .slice(0, 10)
    .map((b) => `${b.title} (${b.category})`);

  return {
    headline: `Built the strongest first version of ${input.appName} with the core screens and preview-ready flow.`,
    completedNow,
    queuedNext,
    suggestedActions: buildSuggestedActions(input.backlog),
    creditsUsedLabel: input.creditsUsed != null ? `${input.creditsUsed} credits used` : undefined,
  };
}

export function renderBuildResultMarkdown(summary: BuildResultSummary): string {
  const lines: string[] = [
    `## ${summary.headline}`,
    "",
    "Built the strongest first version with the core screens and preview-ready flow. The remaining advanced items are queued so you can continue with backend, integrations, auth, or polish next.",
    "",
    "### Included in this version",
    ...summary.completedNow.map((item) => `- ${item}`),
  ];

  if (summary.queuedNext.length) {
    lines.push("", "### Queued for next pass", ...summary.queuedNext.map((item) => `- ${item}`));
  }

  lines.push("", "### Recommended next upgrades");
  for (const action of summary.suggestedActions) {
    const creditHint = action.estimatedCredits ? ` (~${action.estimatedCredits} credits)` : "";
    lines.push(`- **${action.label}**${creditHint}`);
  }

  if (summary.creditsUsedLabel) {
    lines.push("", `*${summary.creditsUsedLabel}*`);
  }

  lines.push("", "Choose a next step when you're ready — I won't continue automatically.");

  return lines.join("\n");
}

export function parseContinueIntent(userText: string): {
  kind: "continue_all" | "continue_category" | "finish_everything" | "none";
  category?: string;
} {
  const lower = userText.trim().toLowerCase();
  if (!lower) return { kind: "none" };
  if (/\bfinish everything|build everything|do it all\b/i.test(lower)) {
    return { kind: "finish_everything" };
  }
  if (/\bcontinue with backend\b|\badd backend\b/i.test(lower)) {
    return { kind: "continue_category", category: "backend" };
  }
  if (/\bcontinue with auth\b|\badd auth\b|\badd authentication\b/i.test(lower)) {
    return { kind: "continue_category", category: "auth" };
  }
  if (/\bcontinue with integration\b|\bconnect integration\b/i.test(lower)) {
    return { kind: "continue_category", category: "integration" };
  }
  if (/\bcontinue\b|\bkeep building\b|\bnext pass\b/i.test(lower)) {
    return { kind: "continue_all" };
  }
  return { kind: "none" };
}

export function formatFinishEverythingEstimate(totalCredits: number): string {
  if (totalCredits <= 50) {
    return `Finishing everything is estimated at ~${totalCredits} credits in one extended pass.`;
  }
  const stages = Math.ceil(totalCredits / 40);
  return `Finishing everything is estimated at ~${totalCredits} credits. I recommend splitting into ${stages} staged passes (~40 credits each) for the best balance of quality and cost.`;
}
