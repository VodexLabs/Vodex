/**
 * Provider token pricing map — admin/budget use only. Normal users never see this.
 */
import { toApiModelId } from "@/lib/ai/model-catalog";

export type PricingSource = "provider_usage" | "pricing_config" | "estimated";

export type ModelPricingEntry = {
  apiModelId: string;
  inputPerMillion: number;
  outputPerMillion: number;
  /** True when catalog alias or rate is not confirmed from provider billing. */
  estimated: boolean;
  note?: string;
};

/** USD per 1M tokens — keyed by resolved API model id. */
export const MODEL_PRICING_MAP: Record<string, ModelPricingEntry> = {
  "gpt-4o-mini": {
    apiModelId: "gpt-4o-mini",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    estimated: false,
  },
  "gpt-4o": {
    apiModelId: "gpt-4o",
    inputPerMillion: 2.5,
    outputPerMillion: 10,
    estimated: false,
  },
  "claude-haiku-4-5": {
    apiModelId: "claude-haiku-4-5",
    inputPerMillion: 0.8,
    outputPerMillion: 4,
    estimated: false,
  },
  "claude-sonnet-4-5": {
    apiModelId: "claude-sonnet-4-5",
    inputPerMillion: 3,
    outputPerMillion: 15,
    estimated: false,
  },
  "claude-opus-4-5": {
    apiModelId: "claude-opus-4-5",
    inputPerMillion: 15,
    outputPerMillion: 75,
    estimated: false,
  },
  "claude-opus-4-6": {
    apiModelId: "claude-opus-4-6",
    inputPerMillion: 15,
    outputPerMillion: 75,
    estimated: true,
    note: "Catalog opus 4-7/4-6 aliases map here; rates match Anthropic Opus tier (estimated)",
  },
  "gemini-2.0-flash": {
    apiModelId: "gemini-2.0-flash",
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    estimated: false,
  },
  "gemini-2.5-flash": {
    apiModelId: "gemini-2.5-flash",
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    estimated: false,
  },
  "gemini-2.5-pro": {
    apiModelId: "gemini-2.5-pro",
    inputPerMillion: 1.25,
    outputPerMillion: 5,
    estimated: false,
  },
  "grok-4": {
    apiModelId: "grok-4",
    inputPerMillion: 3,
    outputPerMillion: 15,
    estimated: true,
    note: "coming soon — estimated placeholder",
  },
};

/** Catalog ids that resolve to each API model (for admin audits). */
export const CATALOG_ALIAS_NOTES: Record<string, string> = {
  "gpt-5-4-mini": "maps to gpt-4o-mini",
  "gpt-5-4": "maps to gpt-4o",
  "gpt-5-5": "maps to gpt-4o",
  "claude-sonnet-4-6": "maps to claude-sonnet-4-5 API",
  "claude-opus-4-7": "maps to claude-opus-4-6 API",
  "claude-opus-4-6": "maps to claude-opus-4-6 API",
  "gemini-flash": "maps to gemini-2.5-flash via env",
  "gemini-3-1-pro": "maps to gemini-2.5-pro via env",
};

export function resolveModelPricing(catalogOrApiModelId: string): ModelPricingEntry & {
  resolvedApiModelId: string;
  pricingSource: PricingSource;
} {
  const resolvedApiModelId = toApiModelId(catalogOrApiModelId);
  const entry = MODEL_PRICING_MAP[resolvedApiModelId];
  if (entry) {
    return {
      ...entry,
      resolvedApiModelId,
      pricingSource: entry.estimated ? "estimated" : "pricing_config",
    };
  }
  const fallback = MODEL_PRICING_MAP["gpt-4o-mini"]!;
  return {
    ...fallback,
    apiModelId: resolvedApiModelId,
    resolvedApiModelId,
    estimated: true,
    note: `No pricing row for ${resolvedApiModelId}; using gpt-4o-mini fallback (estimated)`,
    pricingSource: "estimated",
  };
}

export function calculateTokenProviderCostUsd(
  catalogOrApiModelId: string,
  inputTokens: number,
  outputTokens: number,
): {
  costUsd: number;
  pricingSource: PricingSource;
  resolvedApiModelId: string;
  estimated: boolean;
  pricingNote: string | null;
} {
  const pricing = resolveModelPricing(catalogOrApiModelId);
  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return {
    costUsd,
    pricingSource: pricing.pricingSource,
    resolvedApiModelId: pricing.resolvedApiModelId,
    estimated: pricing.estimated,
    pricingNote: pricing.note ?? null,
  };
}
