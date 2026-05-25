/**
 * Build credit classifier — charge by implemented work tier, not raw prompt length.
 */
import type { FirstPassTier } from "@/lib/build/first-pass-scope";
import { firstPassTierCredits } from "@/lib/build/first-pass-scope";
import { estimatePromptTokens } from "@/lib/ai/prompt-compression-policy";

export type BuildCreditTier = "first_pass_simple" | "first_pass_standard" | "first_pass_advanced" | "heavy_continuation";

export type BuildCreditClassification = {
  tier: BuildCreditTier;
  complexity: number;
  creditFloor: number;
  creditCeiling: number;
  promptLengthIgnored: boolean;
  reason: string;
};

export function classifyBuildCredits(input: {
  firstPassTier: FirstPassTier;
  scopeComplexity: number;
  rawPromptLength: number;
  promptWasCompressed: boolean;
  isContinuation?: boolean;
}): BuildCreditClassification {
  if (input.isContinuation) {
    return {
      tier: "heavy_continuation",
      complexity: Math.min(10, input.scopeComplexity + 2),
      creditFloor: 50,
      creditCeiling: 100,
      promptLengthIgnored: true,
      reason: "continuation_deep_work",
    };
  }

  const range = firstPassTierCredits(input.firstPassTier);
  const complexity =
    input.firstPassTier === "advanced"
      ? Math.max(7, input.scopeComplexity)
      : input.firstPassTier === "standard"
        ? Math.max(5, input.scopeComplexity)
        : Math.max(3, input.scopeComplexity);

  const tierKey =
    input.firstPassTier === "advanced"
      ? "first_pass_advanced"
      : input.firstPassTier === "standard"
        ? "first_pass_standard"
        : "first_pass_simple";

  const rawTokens = estimatePromptTokens(" ".repeat(input.rawPromptLength));
  const promptLengthIgnored = input.promptWasCompressed && rawTokens >= 4000;

  return {
    tier: tierKey,
    complexity,
    creditFloor: range.min,
    creditCeiling: range.max,
    promptLengthIgnored,
    reason: promptLengthIgnored
      ? "huge_prompt_compressed_first_pass_tier"
      : `${input.firstPassTier}_first_pass`,
  };
}

export function effectivePromptLengthForCredits(
  rawLength: number,
  promptWasCompressed: boolean,
): number {
  if (promptWasCompressed && estimatePromptTokens(" ".repeat(rawLength)) >= 4000) {
    return 800;
  }
  return rawLength;
}
