"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, Zap } from "lucide-react";

export type BuildStrategy = "plan_first" | "build_now";

const OPTIONS: Array<{
  id: BuildStrategy;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: "build_now",
    label: "Build now",
    desc: "Start creating immediately",
    icon: Zap,
  },
  {
    id: "plan_first",
    label: "Plan first",
    desc: "Review the plan before building",
    icon: ClipboardList,
  },
];

/** Small toggle — Plan first is optional inside Build flow, not a second mode row. */
export function PlanFirstToggle({
  enabled,
  onChange,
  className,
  showHint,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  showHint?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="plan-first-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        data-plan-first={enabled ? "on" : "off"}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition",
          enabled ? "bg-accent" : "bg-muted ring-1 ring-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition",
            enabled ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
      <span className="text-[11px] font-medium text-muted-foreground">Plan first</span>
      {showHint && enabled ? (
        <span className="text-[10px] text-muted-foreground/70">Review blueprint before building</span>
      ) : null}
    </div>
  );
}

export function buildStrategyFromToggle(enabled: boolean): BuildStrategy {
  return enabled ? "plan_first" : "build_now";
}

export function toggleFromBuildStrategy(strategy: BuildStrategy): boolean {
  return strategy === "plan_first";
}

/** @deprecated Use PlanFirstToggle in product UI — segmented control removed. */
export function PlanFirstControl({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: BuildStrategy;
  onChange: (next: BuildStrategy) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center", className)}
      data-testid="plan-first-control"
      title="Plan first creates a short blueprint before building so you can approve the direction."
    >
      <div
        className={cn(
          "inline-flex rounded-lg bg-surface p-0.5 ring-1 ring-border",
          compact && "p-0.5",
        )}
        role="group"
        aria-label="Build strategy"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              data-strategy={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                active
                  ? "bg-accent/12 text-accent ring-1 ring-accent/25"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <Icon className="size-3" strokeWidth={1.75} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="ml-2 hidden text-[10px] text-muted-foreground/70 sm:block">
          {OPTIONS.find((o) => o.id === value)?.desc}
        </p>
      )}
    </div>
  );
}

/** Suggest Plan first for longer / multi-feature prompts. */
export function suggestBuildStrategy(prompt: string): BuildStrategy {
  const text = prompt.trim().toLowerCase();
  if (text.length < 80) return "build_now";
  const complexHints = [
    "dashboard",
    "marketplace",
    "multi",
    "platform",
    "saas",
    "admin",
    "booking",
    "e-commerce",
    "ecommerce",
    "social",
    "crm",
    "subscription",
    "payment",
    "stripe",
    "role",
    "team",
  ];
  if (complexHints.some((h) => text.includes(h))) return "plan_first";
  if (text.split(/\s+/).length > 25) return "plan_first";
  return "build_now";
}
