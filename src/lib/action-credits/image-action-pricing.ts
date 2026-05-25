import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";

export type ImageActionTier = "image_simple" | "image_standard" | "image_premium" | "image_edit";

export const IMAGE_TIER_FLOORS: Record<ImageActionTier, number> = {
  image_simple: 2,
  image_standard: 4,
  image_premium: 8,
  image_edit: 10,
};

export function quoteImageActionCredits(input: {
  tier: ImageActionTier;
  providerCostUsd?: number | null;
}): ReturnType<typeof quoteActionCredits> {
  return quoteActionCredits({
    actionType: input.tier,
    providerCostUsd: input.providerCostUsd,
    dynamicFloor: IMAGE_TIER_FLOORS[input.tier],
  });
}
