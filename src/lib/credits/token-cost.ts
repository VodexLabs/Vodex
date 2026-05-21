/** Per-token provider cost estimates (USD) for budget guards. */

const PER_MILLION: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-haiku-4-5": { in: 0.8, out: 4 },
  "claude-sonnet-4-5": { in: 3, out: 15 },
  "claude-opus-4-5": { in: 15, out: 75 },
  "gemini-2.0-flash": { in: 0.075, out: 0.3 },
  "grok-4": { in: 3, out: 15 },
};

import { toApiModelId } from "@/lib/ai/model-catalog";

export function estimateTokenProviderCostUsd(
  catalogOrApiModelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const api = toApiModelId(catalogOrApiModelId);
  const rates = PER_MILLION[api] ?? PER_MILLION["gpt-4o-mini"]!;
  return (inputTokens / 1_000_000) * rates.in + (outputTokens / 1_000_000) * rates.out;
}
