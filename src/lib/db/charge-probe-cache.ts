import type { ChargeTokensProbeResult } from "@/lib/db/probe-charge-tokens-rpc";
import { probeChargeTokensRpcDetailed } from "@/lib/db/probe-charge-tokens-rpc";

const TTL_MS = 60_000;
const FAILURE_TTL_MS = 30_000;
let cached: { at: number; result: ChargeTokensProbeResult } | null = null;
let inflight: Promise<ChargeTokensProbeResult> | null = null;

function isNetworkProbeFailure(result: ChargeTokensProbeResult): boolean {
  const err = (result.lastError ?? result.postgrestError ?? "").toLowerCase();
  return (
    !result.ok &&
    (/fetch failed|unable to verify|certificate|econnreset|network/i.test(err))
  );
}

/** Cached charge_tokens probe — avoids 5–15s Supabase round-trips on every settings/credits hit. */
export async function getChargeTokensProbeCached(
  force = false,
): Promise<ChargeTokensProbeResult> {
  if (!force && cached) {
    const ttl = isNetworkProbeFailure(cached.result) ? FAILURE_TTL_MS : TTL_MS;
    if (Date.now() - cached.at < ttl) {
      return cached.result;
    }
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
