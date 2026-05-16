"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Zap, Clock, Sparkles, GitBranch } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { aiModels } from "@/lib/data";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const speedDots = { fast: 3, medium: 2, slow: 1 };
const qualityColors = {
  standard: "text-muted-foreground bg-muted/60",
  premium: "text-accent bg-accent-muted",
  ultra: "text-amber-600 bg-amber-500/15 dark:text-amber-400",
};

const providerOrder = ["Anthropic", "OpenAI", "Google", "xAI", "DeepSeek"];

export function ModelsSettings() {
  const [defaultModel, setDefaultModel] = React.useState("claude-sonnet");
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    Object.fromEntries(aiModels.map((m) => [m.id, m.available]))
  );

  const byProvider = providerOrder.map((provider) => ({
    provider,
    models: aiModels.filter((m) => m.provider === provider),
  }));

  return (
    <div className="space-y-6">
      {/* Intelligent routing coming soon */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/6 px-5 py-4"
      >
        <GitBranch className="mt-0.5 size-4 shrink-0 text-amber-400" strokeWidth={2} />
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Intelligent model routing is coming in Q3 2026
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Auto-routing based on task type, budget, and quality requirements. Cost-optimal
            model selection, latency balancing, and fallback chains.
          </p>
        </div>
      </motion.div>

      <motion.div variants={variants.staggerContainer} initial="hidden" animate="show" className="space-y-6">
        {/* Default model */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Default Model</CardTitle>
              <CardDescription>Used for all new app generations unless overridden.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {aiModels.slice(0, 4).map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setDefaultModel(model.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--radius-lg)] p-3 text-left transition ring-1",
                      defaultModel === model.id
                        ? "bg-accent-muted ring-accent/40"
                        : "bg-muted/30 ring-border hover:bg-muted/50",
                    )}
                  >
                    <span className="mt-0.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: model.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">{model.name}</p>
                      <p className="text-[11px] text-muted-foreground">{model.provider}</p>
                    </div>
                    <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", qualityColors[model.quality])}>
                      {model.quality}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Models by provider */}
        {byProvider.filter((g) => g.models.length > 0).map((group) => (
          <motion.div key={group.provider} variants={variants.staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>{group.provider}</CardTitle>
                <CardDescription>{group.models.length} model{group.models.length !== 1 && "s"} available</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/60 p-0">
                {group.models.map((model) => (
                  <div key={model.id} className="flex items-center gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-foreground">{model.name}</p>
                        {model.badge && (
                          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            {model.badge}
                          </span>
                        )}
                        {model.new && (
                          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">New</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{model.description}</p>
                    </div>

                    <div className="hidden items-center gap-4 sm:flex">
                      {/* Speed dots */}
                      <div className="flex items-center gap-1" title={`Speed: ${model.speed}`}>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-1.5 rounded-full",
                              i < speedDots[model.speed] ? "bg-positive" : "bg-muted/60",
                            )}
                          />
                        ))}
                      </div>

                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Zap className="size-3" strokeWidth={1.75} />
                        {model.creditsPerGeneration} cr
                      </span>
                      <span className="text-[11px] text-muted-foreground">{model.contextWindow} ctx</span>
                    </div>

                    <Switch
                      checked={enabled[model.id]}
                      onCheckedChange={(v) => setEnabled((prev) => ({ ...prev, [model.id]: v }))}
                      aria-label={`Enable ${model.name}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
