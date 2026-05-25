import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";

/** User-facing Action Credit cost for automatic app logo generation. */
export const STANDARD_LOGO_ACTION_CREDITS = 0.5;

/** User-facing Action Credit cost for manual logo regeneration. */
export const REGENERATE_LOGO_ACTION_CREDITS = 0.5;

export function quoteLogoGenerationCredits(providerCostUsd?: number | null) {
  return quoteActionCredits({
    actionType: "app_logo_generation",
    providerCostUsd,
    dynamicFloor: STANDARD_LOGO_ACTION_CREDITS,
  });
}

export function quoteLogoRegenerationCredits(providerCostUsd?: number | null) {
  return quoteActionCredits({
    actionType: "app_logo_regeneration",
    providerCostUsd,
    dynamicFloor: REGENERATE_LOGO_ACTION_CREDITS,
  });
}
