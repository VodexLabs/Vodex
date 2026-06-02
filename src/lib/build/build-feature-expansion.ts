/**
 * Expands short, general app prompts into a concrete MVP spec before planning/codegen.
 */
import {
  classifyAppArchetype,
  type AppArchetypeId,
} from "@/lib/build/app-archetype-classifier";

const SHALLOW_MAX_CHARS = 320;
const SHALLOW_MAX_CLAUSES = 4;

export type BuildFeatureExpansion = {
  expanded: boolean;
  originalPrompt: string;
  executionPrompt: string;
  addedFeatures: string[];
  archetypeId: AppArchetypeId;
};

const ARCHETYPE_MVP_FEATURES: Partial<Record<AppArchetypeId, string[]>> = {
  restaurant_inventory: [
    "Inventory dashboard with KPI cards: total SKUs, low-stock count, expiring within 7 days, monthly waste %",
    "Ingredient records table with category, unit, par level, on-hand qty, supplier, and location",
    "Stock level views with color-coded status (ok / low / critical) and quick adjust actions",
    "Expiry date tracking with sortable list and 'use first' badges",
    "Low-stock alerts panel with reorder suggestions and threshold settings",
    "Categories taxonomy (produce, dairy, dry goods, proteins) with filters",
    "Shopping list generated from low-stock and par gaps with check-off UI",
    "Usage history log (deductions, waste, transfers) with simple chart",
    "Recipe suggestions using on-hand ingredients (3–6 sample recipes)",
    "Settings: units, default par levels, notification preferences",
    "Realistic sample data across all screens (no empty tables)",
    "Polished sidebar navigation and responsive dashboard layout",
  ],
  finance_tracker: [
    "Dashboard with balance, spend trend, and category breakdown",
    "Transactions list with filters, search, and sample rows",
    "Budgets per category with progress bars",
    "Insights screen with monthly comparison cards",
    "Settings for currency and categories",
    "Sample data populated across views",
  ],
  saas_dashboard: [
    "Metrics dashboard with KPI cards and activity chart",
    "Users table with status filters",
    "Analytics view with trend lines",
    "Team/settings screen",
    "Sample data and polished empty states",
  ],
  generic_app: [
    "Primary dashboard with KPI summary cards and recent activity",
    "Core entity list screen with search, filters, and sample rows",
    "Detail/create flow for the main record type",
    "Reports or insights view with chart placeholders fed by mock data",
    "Settings screen (profile, preferences)",
    "Sidebar or top navigation linking all screens",
    "Realistic mock data — no placeholder-only pages",
  ],
};

function countIntentClauses(prompt: string): number {
  return prompt
    .split(/\n|[;,]|(?:\band\b)/i)
    .map((p) => p.replace(/^[\d\-*•.]+\s*/, "").trim())
    .filter((p) => p.length > 6).length;
}

function isShallowPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (trimmed.length > 1200) return false;
  const clauses = countIntentClauses(trimmed);
  if (clauses >= SHALLOW_MAX_CLAUSES && trimmed.length > 180) return false;
  return trimmed.length <= SHALLOW_MAX_CHARS || clauses < SHALLOW_MAX_CLAUSES;
}

function featuresForArchetype(archetypeId: AppArchetypeId): string[] {
  return (
    ARCHETYPE_MVP_FEATURES[archetypeId] ??
    ARCHETYPE_MVP_FEATURES.generic_app ??
    []
  );
}

/** Expand vague prompts into an execution-ready MVP brief. */
export function expandBuildPromptIfShallow(rawPrompt: string): BuildFeatureExpansion {
  const originalPrompt = rawPrompt.trim();
  const archetype = classifyAppArchetype(originalPrompt);
  const archetypeId = archetype.id;

  if (!isShallowPrompt(originalPrompt)) {
    return {
      expanded: false,
      originalPrompt,
      executionPrompt: originalPrompt,
      addedFeatures: [],
      archetypeId,
    };
  }

  const features = featuresForArchetype(archetypeId);
  if (!features.length) {
    return {
      expanded: false,
      originalPrompt,
      executionPrompt: originalPrompt,
      addedFeatures: [],
      archetypeId,
    };
  }

  const executionPrompt = [
    `User request: ${originalPrompt}`,
    "",
    `Expanded MVP (${archetype.label}) — implement ALL of the following in the first build:`,
    ...features.map((f) => `- ${f}`),
    "",
    "Quality bar: dedicated route/page per major screen, shared app shell, mock data, production-polished UI.",
    "Do not ship a welcome-only home or three plain cards.",
  ].join("\n");

  return {
    expanded: true,
    originalPrompt,
    executionPrompt,
    addedFeatures: features,
    archetypeId,
  };
}
