import type { AppArchetype } from "@/lib/build/app-archetype-classifier";
import {
  buildGeneratedDesignSystem,
  designSystemPromptBlock,
  type GeneratedDesignSystem,
} from "@/lib/build/generated-app-design-system";
import { archetypePatternPromptBlock } from "@/lib/build/generated-ui-patterns";
import { formatQualityContractForPrompt } from "@/lib/build/ui-quality-contract";

export type DesignBrief = {
  archetypeId: string;
  archetypeLabel: string;
  appName: string;
  purpose: string;
  audience: string;
  visualTone: string;
  navigationStyle: string;
  routes: string[];
  primaryScreenSections: string[];
  terminology: string[];
  designSystem: GeneratedDesignSystem;
  promptBlock: string;
};

function normalizePurpose(raw: string): string {
  return raw
    .replace(/^(build|create|make|design)\s+(me\s+)?(a|an|the)\s+/i, "")
    .replace(/\?+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function routesFromPlan(planPages: string[] | undefined, archetype: AppArchetype): string[] {
  const fromPlan = (planPages ?? [])
    .map((p) => {
      const slug = String(p)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return slug ? `/${slug}` : "";
    })
    .filter(Boolean);
  const merged = [...new Set([...archetype.coreRoutes, ...fromPlan])];
  return merged.slice(0, 8);
}

/** Deterministic design brief — cheap stage; heavy model receives this, not raw prompt alone. */
export function buildDesignBrief(input: {
  buildIntent: string;
  archetype: AppArchetype;
  appName: string;
  planSummary?: string;
  planPages?: string[];
}): DesignBrief {
  const purpose = normalizePurpose(input.buildIntent) || input.planSummary?.slice(0, 240) || input.archetype.label;
  const designSystem = buildGeneratedDesignSystem(input.archetype);
  const routes = routesFromPlan(input.planPages, input.archetype);

  const promptBlock = [
    "DESIGN BRIEF (follow exactly for production-quality UI):",
    `App: ${input.appName}`,
    `Purpose: ${purpose}`,
    `Archetype: ${input.archetype.label} (${input.archetype.id})`,
    `Audience: operators and daily users of this ${input.archetype.label.toLowerCase()}`,
    `Visual tone: ${input.archetype.visualTone}`,
    `Navigation: ${input.archetype.navigationStyle}`,
    `Routes (each needs a dedicated page file): ${routes.join(", ")}`,
    `Primary screen sections: ${input.archetype.primarySections.join("; ")}`,
    `Domain terms: ${input.archetype.terminology.join(", ")}`,
    designSystemPromptBlock(designSystem),
    archetypePatternPromptBlock(input.archetype.id),
    formatQualityContractForPrompt(),
    "Never output a basic Welcome headline with only 3 plain cards. Ship a rich dashboard/home.",
  ].join("\n\n");

  return {
    archetypeId: input.archetype.id,
    archetypeLabel: input.archetype.label,
    appName: input.appName,
    purpose,
    audience: `Daily users of ${input.appName}`,
    visualTone: input.archetype.visualTone,
    navigationStyle: input.archetype.navigationStyle,
    routes,
    primaryScreenSections: input.archetype.primarySections,
    terminology: input.archetype.terminology,
    designSystem,
    promptBlock,
  };
}
