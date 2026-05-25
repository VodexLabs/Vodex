"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Sparkles, Brain, Gauge, MessageSquare, Eye, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { aiModels, type AIModel } from "@/lib/data";
import { listUserVisibleCatalogModels } from "@/lib/ai/model-catalog-availability";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const speedDots = { fast: 3, medium: 2, slow: 1 };
const qualityColors = {
  standard: "text-muted-foreground bg-muted/60",
  premium: "text-accent bg-accent-muted",
  ultra: "text-amber-600 bg-amber-500/15 dark:text-amber-400",
};

// ─── Per-model enrichment ─────────────────────────────────────────────────────

interface ModelDetail {
  strengths: string[];
  weaknesses: string[];
  idealFor: string[];
  orchestrationRole: string;
  reasoning: "low" | "medium" | "high" | "very high";
  multimodal: boolean;
  latency: "fast" | "moderate" | "slow";
}

const MODEL_DETAILS: Record<string, ModelDetail> = {
  "claude-opus-4-7": {
    strengths: ["Deep reasoning", "Nuanced writing", "Complex code architecture", "Long-context analysis"],
    weaknesses: ["Slow response", "High credit cost"],
    idealFor: ["Full SaaS apps", "Complex logic", "Enterprise code"],
    orchestrationRole: "Lead architect — used for high-stakes decisions",
    reasoning: "very high",
    multimodal: false,
    latency: "slow",
  },
  "claude-sonnet-4-5": {
    strengths: ["Excellent coding", "Balanced speed/quality", "Strong reasoning"],
    weaknesses: ["Slightly slower than Haiku"],
    idealFor: ["Standard app generation", "Refactoring", "API design"],
    orchestrationRole: "Workhorse — default for most generation tasks",
    reasoning: "high",
    multimodal: false,
    latency: "moderate",
  },
  "claude-haiku-4-5": {
    strengths: ["Very fast", "Low cost", "Good for simple tasks"],
    weaknesses: ["Less capable on complex problems"],
    idealFor: ["Quick edits", "Simple components", "High-volume tasks"],
    orchestrationRole: "Fast lane — used for iterative micro-tasks",
    reasoning: "medium",
    multimodal: false,
    latency: "fast",
  },
  "gpt-5-5": {
    strengths: ["Deep reasoning", "Research synthesis", "Strong math/science"],
    weaknesses: ["High cost", "Slower responses"],
    idealFor: ["Architecture planning", "Research", "Complex multi-step problems"],
    orchestrationRole: "Strategist — used for planning phases",
    reasoning: "very high",
    multimodal: true,
    latency: "slow",
  },
  "gpt-5-4": {
    strengths: ["Multimodal vision", "Structured output", "UI generation"],
    weaknesses: ["Expensive for routine tasks"],
    idealFor: ["UI generation from screenshots", "Schema design", "Structured data"],
    orchestrationRole: "Visual architect — handles design-to-code tasks",
    reasoning: "high",
    multimodal: true,
    latency: "moderate",
  },
  "gpt-5-4-mini": {
    strengths: ["Fast", "Cost-efficient", "Reliable for everyday tasks"],
    weaknesses: ["Limited on very complex reasoning"],
    idealFor: ["Everyday coding", "Refactoring", "Quick answers"],
    orchestrationRole: "Speed tier — handles lightweight subtasks",
    reasoning: "medium",
    multimodal: false,
    latency: "fast",
  },
  "gemini-3-1-pro": {
    strengths: ["2M token context", "Document understanding", "Multimodal", "Large codebase analysis"],
    weaknesses: ["Can be verbose"],
    idealFor: ["Large context analysis", "Document-to-app generation", "Long-form tasks"],
    orchestrationRole: "Context king — handles massive input workloads",
    reasoning: "high",
    multimodal: true,
    latency: "moderate",
  },
  "gemini-flash": {
    strengths: ["Ultra fast", "Very low cost", "1M context"],
    weaknesses: ["Less accurate on complex tasks"],
    idealFor: ["Rapid iteration", "Summaries", "Lightweight tasks"],
    orchestrationRole: "Rapid responder — used for quick subtask resolution",
    reasoning: "low",
    multimodal: false,
    latency: "fast",
  },
  "grok-4": {
    strengths: ["Real-time knowledge", "Strong reasoning", "Creative problem-solving"],
    weaknesses: ["Less tested on coding tasks"],
    idealFor: ["Research", "Analysis", "Creative explorations"],
    orchestrationRole: "Research analyst — current knowledge and analysis",
    reasoning: "high",
    multimodal: false,
    latency: "moderate",
  },
  "composer-latest": {
    strengths: ["Multi-file editing", "Code generation", "Refactoring"],
    weaknesses: ["Limited general reasoning"],
    idealFor: ["Multi-file edits", "Code refactoring", "Targeted generation"],
    orchestrationRole: "Code specialist — precision surgical edits",
    reasoning: "medium",
    multimodal: false,
    latency: "fast",
  },
};

const REASONING_LABELS = { low: "Low", medium: "Medium", high: "High", "very high": "Very High" };
const LATENCY_COLORS = { fast: "text-positive", moderate: "text-amber-500", slow: "text-muted-foreground" };

function ModelHoverCard({ model, children }: { model: AIModel; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<"left" | "right">("right");
  const ref = React.useRef<HTMLDivElement>(null);
  const detail = MODEL_DETAILS[model.id];

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos(rect.right > window.innerWidth - 320 ? "left" : "right");
    }
    setOpen(true);
  }

  if (!detail) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-none absolute top-0 z-50 w-72 rounded-[var(--radius-xl)] bg-background p-4 shadow-2xl ring-1 ring-border",
              pos === "right" ? "left-full ml-3" : "right-full mr-3",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
              <p className="text-[13px] font-semibold text-foreground">{model.name}</p>
              <span className="ml-auto rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{model.provider}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Reasoning</p>
                <p className="text-[11px] font-semibold text-foreground mt-0.5">{REASONING_LABELS[detail.reasoning]}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Latency</p>
                <p className={cn("text-[11px] font-semibold mt-0.5 capitalize", LATENCY_COLORS[detail.latency])}>{detail.latency}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Vision</p>
                <p className="text-[11px] font-semibold text-foreground mt-0.5">{detail.multimodal ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-positive">Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {detail.strengths.map((s) => (
                    <span key={s} className="rounded-full bg-positive/10 px-2 py-0.5 text-[10px] font-medium text-positive">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ideal for</p>
                <div className="flex flex-wrap gap-1">
                  {detail.idealFor.map((s) => (
                    <span key={s} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{s}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Orchestration role</p>
                <p className="text-[11px] text-foreground">{detail.orchestrationRole}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const providerOrder = ["Anthropic", "OpenAI", "Google", "xAI", "DeepSeek"];

export function ModelsSettings() {
  const [defaultModel, setDefaultModel] = React.useState("claude-sonnet");
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    Object.fromEntries(aiModels.map((m) => [m.id, m.available]))
  );

  const visibleModels = React.useMemo(() => listUserVisibleCatalogModels(), []);

  const byProvider = providerOrder.map((provider) => ({
    provider,
    models: visibleModels.filter((m) => m.provider === provider),
  }));

  return (
    <div className="space-y-6">
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
                {visibleModels.filter((m) => m.id !== "automatic").slice(0, 4).map((model) => (
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
                  <ModelHoverCard key={model.id} model={model}>
                    <div className="flex items-center gap-3 px-6 py-4">
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
                        {model.comingSoon && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{model.description}</p>
                    </div>

                    <div className="hidden items-center gap-4 sm:flex">
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
                      checked={enabled[model.id] && !model.comingSoon}
                      disabled={model.comingSoon || !model.available}
                      onCheckedChange={(v) => {
                        if (model.comingSoon || !model.available) return;
                        setEnabled((prev) => ({ ...prev, [model.id]: v }));
                      }}
                      aria-label={`Enable ${model.name}`}
                    />
                  </div>
                  </ModelHoverCard>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
