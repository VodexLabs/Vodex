"use client";

import { cn } from "@/lib/utils";
import { getPlanConfig, type PlanTier } from "@/lib/billing/plan-entitlements";
import { normalizePlanId } from "@/lib/billing/plans";

const TIER_STYLES: Record<
  PlanTier,
  { label: string; className: string; motion?: boolean }
> = {
  free: {
    label: "Free",
    className:
      "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-200",
  },
  starter: {
    label: "Starter",
    className:
      "plan-badge-pattern plan-badge-starter bg-cyan-500/12 text-cyan-800 ring-cyan-500/25 dark:text-cyan-100",
    motion: true,
  },
  pro: {
    label: "Pro",
    className:
      "plan-badge-pattern plan-badge-pro bg-gradient-to-r from-violet-600/15 via-accent/15 to-sky-500/15 text-violet-800 ring-violet-500/30 dark:text-violet-100",
    motion: true,
  },
  infinity: {
    label: "Infinity",
    className:
      "plan-badge-pattern plan-badge-infinity bg-gradient-to-r from-violet-950/90 via-purple-900/85 to-amber-900/70 text-amber-100 ring-amber-500/35",
    motion: true,
  },
};

type PlanBadgeProps = {
  planId: string | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function PlanBadge({ planId, size = "sm", className }: PlanBadgeProps) {
  const config = getPlanConfig(planId);
  const style = TIER_STYLES[config.tier];
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px]"
      : size === "md"
        ? "px-3 py-1 text-[12px]"
        : "px-2 py-0.5 text-[10px]";

  return (
    <span
      data-testid={`plan-badge-${normalizePlanId(planId ?? "free")}`}
      className={cn(
        "relative inline-flex items-center overflow-hidden rounded-full font-semibold capitalize ring-1",
        sizeClass,
        style.className,
        className,
      )}
    >
      {style.motion ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 motion-reduce:hidden"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
            animation: "plan-badge-shimmer 4s ease-in-out infinite",
          }}
        />
      ) : null}
      <span className="relative">{style.label}</span>
    </span>
  );
}
