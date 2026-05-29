/**
 * DreamOS86 media router — user-facing labels only; provider/model in admin logs.
 */

import { routeImageProvider, type ImageProviderRoute } from "@/lib/ai/image-provider-routing";
import type { ImageActionTier } from "@/lib/action-credits/image-action-pricing";
import { quoteDraftVideoCredits } from "@/lib/action-credits/video-draft-pricing";
import { quoteLogoGenerationCredits } from "@/lib/action-credits/logo-generation-pricing";

export type DreamOSMediaKind = "logo" | "image_small" | "image_medium" | "video_draft";

export type DreamOSMediaRoute = {
  kind: DreamOSMediaKind;
  userLabel: string;
  /** Internal only — never expose to normal users. */
  internal: ImageProviderRoute & { videoProvider?: string; videoModelId?: string };
  estimatedProviderCostUsd: number;
  quotedActionCredits: number;
};

const ADMIN_KILL_SWITCH_ENV: Record<DreamOSMediaKind, string> = {
  logo: "DREAMOS_MEDIA_DISABLE_LOGO",
  image_small: "DREAMOS_MEDIA_DISABLE_IMAGE_SMALL",
  image_medium: "DREAMOS_MEDIA_DISABLE_IMAGE_MEDIUM",
  video_draft: "DREAMOS_MEDIA_DISABLE_VIDEO_DRAFT",
};

export function isDreamOSMediaProviderDisabled(kind: DreamOSMediaKind): boolean {
  const key = ADMIN_KILL_SWITCH_ENV[kind];
  return process.env[key]?.trim() === "1" || process.env[key]?.trim()?.toLowerCase() === "true";
}

const DEFAULT_IMAGE_TIER: Record<"image_small" | "image_medium", ImageActionTier> = {
  image_small: "image_simple",
  image_medium: "image_standard",
};

/** Premium / Sora routes are never default. */
export const DISALLOWED_DEFAULT_VIDEO_PROVIDERS = ["sora", "sora-2", "sora_2", "sora-2-pro"] as const;

export function routeDreamOSMedia(kind: DreamOSMediaKind): DreamOSMediaRoute {
  if (kind === "logo") {
    const internal = routeImageProvider("image_simple");
    const quote = quoteLogoGenerationCredits(internal.estimatedCostUsd);
    return {
      kind,
      userLabel: "DreamOS86 Logo",
      internal,
      estimatedProviderCostUsd: internal.estimatedCostUsd,
      quotedActionCredits: quote.finalActionCredits,
    };
  }

  if (kind === "image_small" || kind === "image_medium") {
    const tier = DEFAULT_IMAGE_TIER[kind];
    const internal = routeImageProvider(tier);
    const quote = quoteLogoGenerationCredits(internal.estimatedCostUsd);
    return {
      kind,
      userLabel: kind === "image_small" ? "DreamOS86 Image Small" : "DreamOS86 Image Medium",
      internal,
      estimatedProviderCostUsd: internal.estimatedCostUsd,
      quotedActionCredits: quote.finalActionCredits,
    };
  }

  const videoQuote = quoteDraftVideoCredits({ durationSeconds: 5 });
  return {
    kind: "video_draft",
    userLabel: "DreamOS86 Video Draft",
    internal: {
      ...routeImageProvider("image_simple"),
      videoProvider: "draft_video",
      videoModelId: "cheap-draft-5s",
    },
    estimatedProviderCostUsd: 0.25,
    quotedActionCredits: videoQuote.finalActionCredits,
  };
}

export function assertNoPremiumDefaultRoute(kind: DreamOSMediaKind): void {
  if (kind === "video_draft") {
    const route = routeDreamOSMedia("video_draft");
    const model = route.internal.videoModelId?.toLowerCase() ?? "";
    if (DISALLOWED_DEFAULT_VIDEO_PROVIDERS.some((p) => model.includes(p))) {
      throw new Error("Premium video route is not allowed by default");
    }
  }
  if (kind === "image_small" || kind === "image_medium" || kind === "logo") {
    const route = routeDreamOSMedia(kind);
    if (route.internal.tier === "image_premium" || route.internal.tier === "image_edit") {
      throw new Error("Premium image route is not allowed by default");
    }
  }
}
