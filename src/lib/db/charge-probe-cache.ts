import type { ChargeTokensProbeResult } from "@/lib/db/probe-charge-tokens-rpc";
import { probeChargeTokensRpcDetailed } from "@/lib/db/probe-charge-tokens-rpc";

const TTL_MS = 60_000;
let cached: { at: number; result: ChargeTokensProbeResult } | null = null;
let inflight: Promise<ChargeTokensProbeResult> | null = null;

/** Cached charge_tokens probe — avoids 5–15s Supabase round-trips on every settings/credits hit. */
export async function getChargeTokensProbeCached(
  force = false,
): Promise<ChargeTokensProbeResult> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) {
    return cached.result;
  }

  if (!force && inflight) return inflight;

  inflight = probeChargeTokensRpcDetailed()
    .then((result) => {
      cached = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateChargeTokensProbeCache(): void {
  cached = null;
}
