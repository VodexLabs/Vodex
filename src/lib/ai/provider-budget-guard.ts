/**
 * Provider budget guard — Anthropic quota exhaustion must not block all AI.
 */
import type { ProviderName } from "@/lib/ai/provider-errors";
import {
  getProviderStatus,
  isProviderSelectable,
  listProviderHealthSummary,
} from "@/lib/ai/provider-availability";

export function isAnthropicAvailableForHeavyWork(): boolean {
  const s = getProviderStatus("anthropic");
  return s.configured && !s.disabled && s.status !== "quota_exhausted" && s.status !== "auth_error";
}

export function isAnthropicAvailableForAnyWork(): boolean {
  return isProviderSelectable("anthropic");
}

export function shouldSkipProvider(provider: ProviderName): boolean {
  return !isProviderSelectable(provider);
}

/** Admin-only snapshot — no margins/costs exposed to normal users. */
export function getProviderBudgetGuardSummary(): Array<{
  provider: ProviderName;
  selectable: boolean;
  status: string;
  lastErrorClass: string | null;
}> {
  return listProviderHealthSummary().map((row) => ({
    provider: row.provider,
    selectable: isProviderSelectable(row.provider),
    status: String(row.status),
    lastErrorClass: row.lastErrorClass,
  }));
}
