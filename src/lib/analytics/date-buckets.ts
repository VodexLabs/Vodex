/** Adaptive analytics bucket labels — max ~45 labels for long ranges. */

export type AnalyticsPeriod = "realtime" | "24h" | "7d" | "30d" | "90d" | "365d" | "custom";

export function adaptiveBucketStep(pointCount: number, period: AnalyticsPeriod): number {
  if (period === "24h" || period === "realtime") return 1;
  if (period === "7d") return 1;
  if (period === "30d") return pointCount > 30 ? 2 : 1;
  if (period === "90d") return pointCount > 45 ? Math.ceil(pointCount / 45) : 2;
  if (period === "custom") return pointCount > 45 ? Math.ceil(pointCount / 45) : 1;
  return 1;
}

export function formatAdaptiveBucketLabel(iso: string, period: AnalyticsPeriod): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (period === "realtime" || period === "24h") {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
