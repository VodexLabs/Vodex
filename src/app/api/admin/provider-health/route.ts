import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { listProviderHealthSummary } from "@/lib/ai/provider-availability";
import { providerFromModelId } from "@/lib/ai/provider-errors";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";

export const dynamic = "force-dynamic";

type UsageRow = {
  model_id: string;
  status: string;
  created_at: string;
  tokens_charged: number;
  tokens_input: number | null;
  tokens_output: number | null;
};

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const admin = createServiceRoleClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  type Agg = { requests: number; cost: number; failures: number };
  const empty = (): Agg => ({ requests: 0, cost: 0, failures: 0 });

  const agg24: Record<string, Agg> = {};
  const agg7: Record<string, Agg> = {};
  const agg30: Record<string, Agg> = {};

  if (admin) {
    const { data: logs } = await admin
      .from("ai_usage_logs")
      .select("model_id, status, created_at, tokens_charged, tokens_input, tokens_output")
      .gte("created_at", since30d)
      .limit(5000);

    for (const row of (logs ?? []) as UsageRow[]) {
      const p = providerFromModelId(row.model_id);
      const cost = estimateTokenProviderCostUsd(
        row.model_id,
        row.tokens_input ?? 800,
        row.tokens_output ?? 400,
      );
      const fail = row.status === "error" || row.status === "charge_failed";
      const at = row.created_at ?? "";
      for (const [bucket, since] of [
        [agg30, since30d],
        [agg7, since7d],
        [agg24, since24h],
      ] as const) {
        if (at >= since) {
          bucket[p] ??= empty();
          bucket[p].requests += 1;
          bucket[p].cost += cost;
          if (fail) bucket[p].failures += 1;
        }
      }
    }
  }

  const providers = listProviderHealthSummary().map((p) => {
    const key = p.provider;
    const a24 = agg24[key] ?? empty();
    const warnings: string[] = [];
    if (!p.configured) warnings.push("No key configured");
    if (p.disabledReason) warnings.push(`Disabled by environment: ${p.disabledReason}`);
    if (p.status === "quota_exhausted") warnings.push("Recent quota/billing failure");
    if (p.status === "auth_error") warnings.push("Auth/key error");
    if (p.configured && !p.lastSuccessAt) warnings.push("No successful requests in 24h");
    const warnEnv =
      key === "anthropic"
        ? process.env.ANTHROPIC_DAILY_SPEND_WARNING_USD
        : key === "openai"
          ? process.env.OPENAI_DAILY_SPEND_WARNING_USD
          : key === "google"
            ? process.env.GOOGLE_DAILY_SPEND_WARNING_USD
            : undefined;
    const dailyWarn = Number(warnEnv ?? "");
    if (dailyWarn > 0 && a24.cost >= dailyWarn) warnings.push("High spend today");

    return {
      provider: key,
      configured: p.configured,
      status: p.status,
      disabledReason: p.disabledReason,
      lastSuccessAt: p.lastSuccessAt,
      lastErrorAt: p.lastErrorAt,
      lastErrorClass: p.lastErrorClass,
      balanceApiAvailable: false,
      requests24h: a24.requests,
      cost24hUsd: Math.round(a24.cost * 10000) / 10000,
      cost7dUsd: Math.round((agg7[key]?.cost ?? 0) * 10000) / 10000,
      cost30dUsd: Math.round((agg30[key]?.cost ?? 0) * 10000) / 10000,
      failures24h: a24.failures,
      warnings,
    };
  });

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      providers,
      note: "Balance API not available for most providers — warnings derive from usage logs and recent errors.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
