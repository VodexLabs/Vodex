"use client";

import * as React from "react";
import { Layers, Map, ListChecks, Ban } from "lucide-react";
import type { AppBlueprint } from "@/lib/build/blueprint-schema";
import { cn } from "@/lib/utils";

const INTERNAL_RISK = /\b(supabase|vercel|backend requires|configuration)\b/i;

function safeExclusions(blueprint: AppBlueprint): string[] {
  const raw = blueprint.exclusions?.length
    ? blueprint.exclusions
    : blueprint.excludedFromBuild ?? [];
  return raw.filter((x) => !INTERNAL_RISK.test(x));
}

function safeFeatures(blueprint: AppBlueprint): string[] {
  return blueprint.primaryUserJobs.slice(0, 6);
}

function safeScreens(blueprint: AppBlueprint): Array<{ label: string; purpose: string }> {
  const routes = blueprint.routeMap ?? blueprint.pages ?? [];
  return routes.slice(0, 8).map((p) => ({
    label: p.purpose || p.route.replace(/^\//, "") || "Home",
    purpose: p.purpose || "Main screen",
  }));
}

function safeDataSummary(blueprint: AppBlueprint): string {
  const tables = blueprint.dataModel?.length
    ? blueprint.dataModel
    : blueprint.databaseTables ?? [];
  if (tables.length === 0) {
    return "Lightweight app data — no complex database setup needed to get started.";
  }
  const names = tables.slice(0, 5).map((t) => t.name.replace(/_/g, " "));
  const suffix = tables.length > 5 ? ` and ${tables.length - 5} more` : "";
  return `Your app will organize ${names.join(", ")}${suffix}.`;
}

export function AppBlueprintPanel({
  blueprint,
  className,
  compact,
  showCreditReserve,
}: {
  blueprint: AppBlueprint;
  className?: string;
  compact?: boolean;
  /** Quiet reserve notice near build action — not a scary estimate. */
  showCreditReserve?: boolean;
}) {
  const pitch = blueprint.oneSentencePitch ?? blueprint.corePromise ?? "";
  const exclusions = safeExclusions(blueprint);
  const screens = safeScreens(blueprint);
  const features = safeFeatures(blueprint);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface/90 p-4", className)}>
      <div className="mb-4 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {blueprint.appType}
          {blueprint.category ? ` · ${blueprint.category}` : ""}
        </p>
        <h3 className="text-[17px] font-semibold text-foreground">{blueprint.appName}</h3>
        {pitch ? (
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{pitch.slice(0, 220)}</p>
        ) : null}
      </div>

      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        <section className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Map className="size-3.5 text-accent" strokeWidth={2} />
            Main screens
          </p>
          <ul className="space-y-1.5 text-[12px] text-muted-foreground">
            {screens.map((s, i) => (
              <li key={`${s.label}-${i}`} className="flex gap-2">
                <span className="font-medium text-foreground">{s.label}</span>
                <span className="text-muted-foreground">— {s.purpose}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Layers className="size-3.5 text-accent" strokeWidth={2} />
            Core features
          </p>
          <ul className="space-y-1 text-[12px] text-muted-foreground">
            {features.map((j) => (
              <li key={j}>· {j}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-lg bg-muted/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <ListChecks className="size-3.5" strokeWidth={2} />
          Data your app will use
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{safeDataSummary(blueprint)}</p>
      </section>

      {exclusions.length > 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Ban className="size-3.5" strokeWidth={2} />
            First version scope
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            {exclusions.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
