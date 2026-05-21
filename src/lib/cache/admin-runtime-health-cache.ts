import type { AdminRuntimeHealth } from "@/lib/db/admin-runtime-health";

const TTL_MS = 30_000;
let cached: { at: number; data: AdminRuntimeHealth } | null = null;
let inflight: Promise<AdminRuntimeHealth> | null = null;

export function getCachedAdminRuntimeHealth(
  loader: (opts: { refresh?: boolean }) => Promise<AdminRuntimeHealth>,
  force = false,
): Promise<AdminRuntimeHealth> {
  const now = Date.now();
  if (!force && cached && now - cached.at < TTL_MS) {
    return Promise.resolve({ ...cached.data, source: "cached" as const });
  }
  if (!force && inflight) return inflight;

  inflight = loader({ refresh: force })
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function bustAdminRuntimeHealthCache(): void {
  cached = null;
  inflight = null;
}
