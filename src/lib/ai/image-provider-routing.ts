import type { ImageActionTier } from "@/lib/action-credits/image-action-pricing";

/** Server-side image provider routing — no client exposure. */
export type ImageProviderRoute = {
  tier: ImageActionTier;
  provider: string;
  modelId: string;
  estimatedCostUsd: number;
};

const ROUTES: Record<ImageActionTier, ImageProviderRoute> = {
  image_simple: {
    tier: "image_simple",
    provider: "openai",
    modelId: "gpt-image-1-mini",
    estimatedCostUsd: 0.02,
  },
  image_standard: {
    tier: "image_standard",
    provider: "openai",
    modelId: "gpt-image-1",
    estimatedCostUsd: 0.04,
  },
  image_premium: {
    tier: "image_premium",
    provider: "openai",
    modelId: "gpt-image-1-hd",
    estimatedCostUsd: 0.08,
  },
  image_edit: {
    tier: "image_edit",
    provider: "openai",
    modelId: "gpt-image-1-edit",
    estimatedCostUsd: 0.12,
  },
};

export function routeImageProvider(tier: ImageActionTier = "image_simple"): ImageProviderRoute {
  return ROUTES[tier] ?? ROUTES.image_simple;
}
