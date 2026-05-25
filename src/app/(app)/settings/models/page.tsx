"use client";

import * as React from "react";
import { aiModels, type AIModel } from "@/lib/data";
import { listUserVisibleCatalogModels } from "@/lib/ai/model-catalog-availability";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Zap, BrainCircuit, Gauge, Eye, Code2, MessageCircle } from "lucide-react";

// ─── Provider color tokens ────────────────────────────────────────────────────

const providerColors: Record<string, string> = {
  Anthropic: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400",
  OpenAI:    "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  Google:    "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  xAI:       "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-400",
  DeepSeek:  "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
};

const providerOrder = ["DreamOS86", "Anthropic", "OpenAI", "Google", "xAI", "DeepSeek"];

// ─── Cost stars component ─────────────────────────────────────────────────────

function CostStars({ quality }: { quality: AIModel["quality"] }) {
  const filled = quality === "ultra" ? 5 : quality === "premium" ? 3 : 1;
  return (
    <div className="flex items-center gap-0.5" title={`Cost: ${quality}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Zap
          key={n}
          className={cn(
            "size-3 transition",
            n <= filled ? "text-accent fill-accent/60" : "text-muted-foreground/20",
          )}
          strokeWidth={1.75}
        />
      ))}
    </div>
  );
}

// ─── Speed dots ───────────────────────────────────────────────────────────────

function SpeedDots({ speed }: { speed: AIModel["speed"] }) {
  const filled = speed === "fast" ? 3 : speed === "medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "size-1.5 rounded-full",
            n <= filled ? "bg-foreground" : "bg-muted-foreground/20",
          )}
        />
      ))}
      <span className="ml-1 text-[11px] capitalize text-muted-foreground">{speed}</span>
    </div>
  );
}

// ─── Best-for use cases ───────────────────────────────────────────────────────

const USE_CASES: Record<string, { icon: React.ElementType; label: string }[]> = {
  standard: [
    { icon: MessageCircle, label: "Q&A" },
    { icon: Code2,         label: "Quick code" },
  ],
  premium: [
    { icon: Code2,         label: "Code generation" },
    { icon: BrainCircuit,  label: "Reasoning" },
    { icon: Eye,           label: "Multimodal" },
  ],
  ultra: [
    { icon: BrainCircuit,  label: "Deep reasoning" },
    { icon: Code2,         label: "Complex architecture" },
    { icon: Eye,           label: "Vision & analysis" },
    { icon: Gauge,         label: "Orchestration" },
  ],
};

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ model }: { model: AIModel }) {
  const useCases = USE_CASES[model.quality] ?? [];
  const qualityVariant: Record<AIModel["quality"], "neutral" | "accent" | "positive"> = {
    standard: "neutral",
    premium:  "accent",
    ultra:    "positive",
  };

  return (
    <div className={cn(
      "flex flex-col gap-4 rounded-[var(--radius-xl)] p-5 ring-1 ring-border transition",
      "bg-surface hover:ring-border/80 hover:bg-muted/20",
      !model.available && "opacity-55",
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[12px] font-bold text-white shadow-[var(--shadow-xs)]"
          style={{ backgroundColor: model.color }}
        >
          {model.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13.5px] font-semibold text-foreground tracking-[-0.02em]">
              {model.name}
            </span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-medium", providerColors[model.provider])}>
              {model.provider}
            </span>
            {model.new && <Badge variant="accent" className="text-[10px] px-1.5 py-0">New</Badge>}
            {model.badge && <Badge variant="positive" className="text-[10px] px-1.5 py-0">{model.badge}</Badge>}
            {!model.available && (
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                Coming soon
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{model.description}</p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Cost</span>
          <CostStars quality={model.quality} />
          <Badge variant={qualityVariant[model.quality]} className="capitalize text-[10px] px-1.5 py-0">
            {model.quality}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Speed</span>
          <SpeedDots speed={model.speed} />
        </div>
        <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <Gauge className="size-3.5" strokeWidth={1.6} />
          {model.contextWindow} context
        </div>
      </div>

      {/* Use cases */}
      <div className="flex flex-wrap gap-1.5">
        {useCases.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/50"
          >
            <Icon className="size-3 shrink-0" strokeWidth={1.75} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ModelsSettingsPage() {
  const visibleModels = listUserVisibleCatalogModels();
  const grouped = providerOrder.map((provider) => ({
    provider,
    models: visibleModels.filter((m) => m.provider === provider),
  }));

  return (
    <div className="space-y-8">
      {/* Header note */}
      <div className="rounded-[var(--radius-lg)] border border-accent/20 bg-accent/5 px-5 py-4">
        <p className="text-[13px] font-medium text-foreground">Automatic uses cheap models for chat; premium only when needed</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Discuss and planning run on GPT-5.4 Mini or Gemini Flash. Builds upgrade to stronger models only at
          high complexity. xAI Grok is coming soon.
        </p>
      </div>

      {/* Models by provider */}
      {grouped.map(({ provider, models }) => {
        if (models.length === 0) return null;
        return (
          <div key={provider}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", providerColors[provider])}>
                {provider}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {models.length} model{models.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
