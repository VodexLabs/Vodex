import { isProviderSelectable } from "@/lib/ai/provider-availability";
import type { ProviderName } from "@/lib/ai/provider-errors";
import { resolveGoogleCatalogApiModel } from "@/lib/ai/google-model-config";

/** Maps DreamOS86 catalog IDs to live provider API model IDs. */
export const API_MODEL_MAP: Record<string, string> = {
  "gpt-5.4-mini": "gpt-4o-mini",
  "gpt-5-4-mini": "gpt-4o-mini",
  "gpt-5.4": "gpt-4o",
  "gpt-5-4": "gpt-4o",
  "gpt-5.5": "gpt-4o",
  "gpt-5-5": "gpt-4o",
  "claude-sonnet-4.5": "claude-sonnet-4-5",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-sonnet-4.6": "claude-sonnet-4-5",
  "claude-sonnet-4-6": "claude-sonnet-4-5",
  "claude-haiku-4.5": "claude-haiku-4-5",
  "claude-haiku-4-5": "claude-haiku-4-5",
  "claude-opus-4.7": "claude-opus-4-6",
  "claude-opus-4-7": "claude-opus-4-6",
  "claude-opus-4.6": "claude-opus-4-6",
  "claude-opus-4-6": "claude-opus-4-6",
  "gemini-flash": "gemini-flash",
  "gemini-2-5-pro": "gemini-2-5-pro",
  "gemini-3.1-pro": "gemini-3-1-pro",
  "gemini-3-1-pro": "gemini-3-1-pro",
  "grok-4": "grok-4",
};

export function toApiModelId(catalogId: string): string {
  const mapped = API_MODEL_MAP[catalogId];
  if (!mapped) return catalogId;
  if (mapped.startsWith("gemini-") && !mapped.includes("2.0")) {
    return resolveGoogleCatalogApiModel(catalogId);
  }
  return mapped;
}

export function providerForCatalogId(id: string): "anthropic" | "openai" | "google" | "none" {
  const api = toApiModelId(id);
  if (api.startsWith("claude")) return "anthropic";
  if (api.startsWith("gpt")) return "openai";
  if (api.startsWith("gemini")) return "google";
  if (api.startsWith("grok")) return "none";
  return "none";
}

export function isGrokConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

const HONEST_API_LABELS: Record<string, string> = {
  "gpt-4o-mini": "GPT-4o Mini",
  "gpt-4o": "GPT-4o",
  "claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-haiku-4-5": "Claude Haiku 4.5",
  "claude-opus-4-6": "Claude Opus 4.6",
};

/** User-facing label must match the provider model actually called. */
export function getHonestModelDisplayName(catalogId: string): string {
  const actual = toApiModelId(catalogId);
  if (actual !== catalogId && HONEST_API_LABELS[actual]) {
    return HONEST_API_LABELS[actual];
  }
  const normalized = catalogId.replace(/-/g, ".");
  if (normalized.includes("gpt.5.4.mini")) return HONEST_API_LABELS["gpt-4o-mini"] ?? "GPT-4o Mini";
  if (normalized.includes("gpt.5.4") && !normalized.includes("mini")) {
    return HONEST_API_LABELS["gpt-4o"] ?? "GPT-4o";
  }
  return catalogId;
}

export function resolveModelRuntime(catalogId: string): {
  userSelectedModelLabel: string;
  catalogId: string;
  actualProvider: string;
  actualModelId: string;
} {
  const actualModelId = toApiModelId(catalogId);
  const provider = providerForCatalogId(catalogId);
  return {
    userSelectedModelLabel: getHonestModelDisplayName(catalogId),
    catalogId,
    actualProvider: provider,
    actualModelId,
  };
}

export function pickStandardFast(prefer: "openai" | "google" | "anthropic" = "openai"): string {
  const order: ProviderName[] =
    prefer === "google"
      ? ["google", "openai", "anthropic"]
      : prefer === "anthropic"
        ? ["anthropic", "openai", "google"]
        : ["openai", "google", "anthropic"];
  for (const p of order) {
    if (!isProviderSelectable(p)) continue;
    if (p === "openai") return "gpt-5.4-mini";
    if (p === "google") return "gemini-flash";
    return "claude-haiku-4.5";
  }
  return "gpt-5.4-mini";
}
