import type { ProviderErrorClass, ProviderName } from "@/lib/ai/provider-errors";
import {
  getProviderStatus,
  isProviderConfigured,
  isProviderSelectable,
  listProviderHealthSummary,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/ai/provider-availability";

export type ProviderHealthSnapshot = {
  provider: ProviderName;
  configured: boolean;
  selectable: boolean;
  status: ProviderErrorClass | "coming_soon" | "disabled";
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorClass: ProviderErrorClass | null;
};

/** Admin-safe provider health — no cost/margin fields. */
export function getProviderHealthSnapshot(): ProviderHealthSnapshot[] {
  return listProviderHealthSummary().map((row) => ({
    provider: row.provider,
    configured: row.configured,
    selectable: isProviderSelectable(row.provider),
    status: row.status,
    lastSuccessAt: row.lastSuccessAt,
    lastErrorAt: row.lastErrorAt,
    lastErrorClass: row.lastErrorClass,
  }));
}

export function anyProviderSelectable(): boolean {
  return (["anthropic", "openai", "google"] as ProviderName[]).some((p) => isProviderSelectable(p));
}

export function discussDefaultProvider(): ProviderName {
  if (isProviderSelectable("openai")) return "openai";
  if (isProviderSelectable("google")) return "google";
  if (isProviderSelectable("anthropic")) return "anthropic";
  return "unknown";
}

export {
  getProviderStatus,
  isProviderConfigured,
  isProviderSelectable,
  recordProviderFailure,
  recordProviderSuccess,
};
