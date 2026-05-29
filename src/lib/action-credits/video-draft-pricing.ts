import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";

/** Target provider cost for a 5s draft clip (~$0.25). */
export const DRAFT_VIDEO_5S_PROVIDER_USD = 0.25;

/** Safety-buffered Action Credits for 5s draft video. */
export const DRAFT_VIDEO_5S_ACTION_CREDITS = 58;

/** Safety-buffered Action Credits for 10s draft video. */
export const DRAFT_VIDEO_10S_ACTION_CREDITS = 115;

export function quoteDraftVideoCredits(input: {
  durationSeconds: number;
  providerCostUsd?: number | null;
}): ReturnType<typeof quoteActionCredits> {
  const secs = Math.max(5, Math.round(input.durationSeconds / 5) * 5);
  const estimatedCost =
    input.providerCostUsd != null && input.providerCostUsd > 0
      ? input.providerCostUsd
      : (secs / 5) * DRAFT_VIDEO_5S_PROVIDER_USD;
  const floor =
    secs <= 5 ? DRAFT_VIDEO_5S_ACTION_CREDITS : DRAFT_VIDEO_10S_ACTION_CREDITS;
  return quoteActionCredits({
    actionType: "video_generation",
    providerCostUsd: estimatedCost,
    dynamicFloor: floor,
  });
}
