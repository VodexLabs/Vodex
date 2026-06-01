"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sparkles, CheckCircle2, Loader2,
  Globe, Database, Box, Cpu, Play, Layers,
  ChevronRight, BrainCircuit, Eye, FileCode2,
  FolderOpen, Circle, Zap, Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PhaseStatus = "pending" | "active" | "done";

interface Phase {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  duration: number;
  cards: string[];
}

// ─── Mode-based timing multipliers ───────────────────────────────────────────

const MODE_MULTIPLIERS: Record<string, number> = {
  fast: 0.45,
  balanced: 1.0,
  deep: 1.85,
  production: 2.4,
  autonomous: 3.2,
};

const MODE_LABELS: Record<string, string> = {
  fast: "Fast",
  balanced: "Balanced",
  deep: "Deep Build",
  production: "Production",
  autonomous: "Autonomous",
};

// ─── Generation phases ────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: "intent",
    label: "Intent Analysis",
    description: "Parsing prompt, identifying app category and goals",
    icon: BrainCircuit,
    color: "text-violet-500",
    duration: 2500,
    cards: ["Parsing prompt", "Detecting app category", "Identifying user goals", "Estimating scope"],
  },
  {
    id: "planning",
    label: "Product Planning",
    description: "Defining features, user flows, and information architecture",
    icon: Layers,
    color: "text-accent",
    duration: 3000,
    cards: ["Feature mapping", "User journey design", "Information architecture", "Content strategy"],
  },
  {
    id: "design",
    label: "Design System",
    description: "Generating tokens, typography, spacing, and color palette",
    icon: Eye,
    color: "text-pink-500",
    duration: 2200,
    cards: ["Color palette", "Typography scale", "Spacing system", "Component tokens"],
  },
  {
    id: "database",
    label: "Database Design",
    description: "Modeling schema, relationships, and indexes",
    icon: Database,
    color: "text-emerald-500",
    duration: 2800,
    cards: ["Entity modeling", "Relationship mapping", "Index strategy", "RLS policies"],
  },
  {
    id: "backend",
    label: "Backend Architecture",
    description: "API routes, auth layer, middleware, services",
    icon: Box,
    color: "text-amber-500",
    duration: 3000,
    cards: ["Auth strategy", "API design", "Middleware chain", "Service architecture"],
  },
  {
    id: "security",
    label: "Security Pass",
    description: "Hardening auth, validating inputs, checking permissions",
    icon: Cpu,
    color: "text-red-400",
    duration: 1800,
    cards: ["Input validation", "Permission model", "Secret handling", "CORS policy"],
  },
  {
    id: "components",
    label: "Component Generation",
    description: "Writing UI components, layouts, and interactions",
    icon: FileCode2,
    color: "text-blue-500",
    duration: 4000,
    cards: ["Navigation", "Page layouts", "UI components", "Form systems", "Data tables", "Dashboards"],
  },
  {
    id: "responsive",
    label: "Responsive Adaptation",
    description: "Mobile, tablet, and wide-screen breakpoints",
    icon: Layers,
    color: "text-cyan-500",
    duration: 2000,
    cards: ["Mobile breakpoints", "Tablet layouts", "Wide-screen adaptation", "Touch targets"],
  },
  {
    id: "integrations",
    label: "Integration Layer",
    description: "Connecting APIs, SDKs, and third-party services",
    icon: Globe,
    color: "text-teal-500",
    duration: 2200,
    cards: ["API connectors", "SDK setup", "Webhook handlers", "Environment config"],
  },
  {
    id: "optimization",
    label: "Optimization",
    description: "Code-splitting, caching, performance budgets",
    icon: Cpu,
    color: "text-orange-400",
    duration: 1600,
    cards: ["Code splitting", "Image optimization", "Cache strategy", "Bundle analysis"],
  },
  {
    id: "assembly",
    label: "Build Assembly",
    description: "Resolving dependencies and compiling the final bundle",
    icon: Box,
    color: "text-amber-500",
    duration: 3500,
    cards: ["Resolving packages", "TypeScript types", "Tree shaking", "Asset bundling"],
  },
  {
    id: "preview",
    label: "Preview Ready",
    description: "Your app is live and ready to explore",
    icon: Play,
    color: "text-positive",
    duration: 1200,
    cards: ["Bundling complete", "Routes verified", "Preview running", "Workspace ready"],
  },
];

// ─── File tree ────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

function buildFileTree(prompt: string): FileNode[] {
  const l = prompt.toLowerCase();
  const hasAuth = l.includes("auth") || l.includes("login") || l.includes("user");
  const hasDB = l.includes("database") || l.includes("supabase") || l.includes("data");
  return [
    { name: "src", type: "folder", children: [
      { name: "app", type: "folder", children: [
        { name: "page.tsx", type: "file" },
        { name: "layout.tsx", type: "file" },
        ...(hasAuth ? [{ name: "(auth)", type: "folder" as const, children: [
          { name: "login/page.tsx", type: "file" as const },
        ]}] : []),
      ]},
      { name: "components", type: "folder", children: [
        { name: "ui", type: "folder", children: [
          { name: "button.tsx", type: "file" },
          { name: "card.tsx", type: "file" },
        ]},
      ]},
      { name: "lib", type: "folder", children: [
        { name: "utils.ts", type: "file" },
        ...(hasDB ? [{ name: "db.ts", type: "file" as const }] : []),
        ...(hasAuth ? [{ name: "auth.ts", type: "file" as const }] : []),
      ]},
    ]},
    { name: "package.json", type: "file" },
    { name: "next.config.ts", type: "file" },
    { name: "tailwind.config.ts", type: "file" },
  ];
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = React.useState(depth < 2);
  const isFolder = node.type === "folder";
  return (
    <div>
      <button
        type="button"
        onClick={() => isFolder && setOpen((v) => !v)}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded py-[3px] text-left text-[11px] transition hover:bg-white/5",
          isFolder ? "font-medium text-[#c9d1d9]" : "text-[#8b949e]",
        )}
      >
        {isFolder && (
          <ChevronRight
            className={cn("size-3 shrink-0 text-[#6e7681] transition-transform", open && "rotate-90")}
            strokeWidth={2}
          />
        )}
        {!isFolder && <span className="w-3 shrink-0" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children?.map((c) => (
        <FileTreeNode key={c.name} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Streaming code snippet ───────────────────────────────────────────────────

const CODE_SNIPPET = `// app/page.tsx — generated by Vodex
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
    </main>
  );
}

// components/hero.tsx
export function HeroSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold
        tracking-tight text-foreground">
        Built with Vodex
      </h1>
      <p className="mt-4 text-muted-foreground">
        AI-native. Production-ready.
      </p>
    </section>
  );
}`;

function CodeStream({ active }: { active: boolean }) {
  const [chars, setChars] = React.useState("");
  React.useEffect(() => {
    if (!active) return;
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setChars(CODE_SNIPPET.slice(0, i));
      if (i >= CODE_SNIPPET.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [active]);

  if (!chars) return null;
  return (
    <pre className="h-full overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[#e6edf3] whitespace-pre-wrap break-all">
      {chars}
      {chars.length < CODE_SNIPPET.length && (
        <span className="animate-pulse text-accent">▌</span>
      )}
    </pre>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export function GenerationWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") ?? "Build a web application";
  const attachmentCount = parseInt(searchParams.get("attachments") ?? "0");
  const mode = searchParams.get("mode") ?? "balanced";
  const multiplier = MODE_MULTIPLIERS[mode] ?? 1.0;
  const modeLabel = MODE_LABELS[mode] ?? "Balanced";

  const [currentPhaseIdx, setCurrentPhaseIdx] = React.useState(0);
  const [phaseStatuses, setPhaseStatuses] = React.useState<Record<string, PhaseStatus>>(
    Object.fromEntries(PHASES.map((p) => [p.id, "pending"])),
  );
  const [visibleCards, setVisibleCards] = React.useState<Record<string, number>>(
    Object.fromEntries(PHASES.map((p) => [p.id, 0])),
  );
  const [done, setDone] = React.useState(false);
  const [showCode, setShowCode] = React.useState(false);
  const [fileTree] = React.useState(() => buildFileTree(prompt));

  const currentPhase = PHASES[currentPhaseIdx];

  // Run phases with mode-adaptive timing
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      for (let i = 0; i < PHASES.length; i++) {
        if (cancelled) return;
        const phase = PHASES[i];

        setCurrentPhaseIdx(i);
        setPhaseStatuses((p) => ({ ...p, [phase.id]: "active" }));

        // Scale duration by mode multiplier + slight randomization for realism
        const jitter = 0.85 + Math.random() * 0.3;
        const scaledDuration = Math.round(phase.duration * multiplier * jitter);
        const cardInterval = scaledDuration / phase.cards.length;

        for (let c = 0; c < phase.cards.length; c++) {
          if (cancelled) return;
          // Add micro-pauses between cards for natural rhythm
          const cardDelay = cardInterval * (0.8 + Math.random() * 0.4);
          await new Promise((r) => setTimeout(r, cardDelay));
          setVisibleCards((v) => ({ ...v, [phase.id]: c + 1 }));
        }

        if (cancelled) return;
        setPhaseStatuses((p) => ({ ...p, [phase.id]: "done" }));
      }
      if (!cancelled) setDone(true);
    }

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplier]);

  const completedCount = Object.values(phaseStatuses).filter((s) => s === "done").length;
  const progress = (completedCount / PHASES.length) * 100;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Back
        </button>

        <div className="h-4 w-px bg-border" />

        <div className="flex flex-1 items-center gap-2">
          <div className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full",
            done ? "bg-positive/15" : "bg-accent/10",
          )}>
            {done
              ? <CheckCircle2 className="size-3 text-positive" strokeWidth={2.5} />
              : <Loader2 className="size-3 animate-spin text-accent" strokeWidth={2} />}
          </div>
          <p className="truncate text-[12.5px] font-medium text-foreground max-w-xs sm:max-w-lg">
            {done ? "Generation complete" : currentPhase?.label}
          </p>
          {!done && (
            <span className="text-[11px] text-muted-foreground">
              {currentPhase?.description}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="hidden w-28 sm:block">
          <div className="h-1 overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className={cn("h-full rounded-full", done ? "bg-positive" : "bg-accent")}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Watch AI Build toggle */}
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          className={cn(
            "hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition sm:flex",
            showCode
              ? "bg-surface ring-1 ring-border text-foreground"
              : "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
        >
          <FileCode2 className="size-3.5" strokeWidth={1.75} />
          Watch AI Build
        </button>

        {done && (
          <Button
            variant="accent"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => router.push("/projects")}
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} />
            Open workspace
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Watch AI Build — code panel (left) */}
        <AnimatePresence>
          {showCode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex shrink-0 flex-col overflow-hidden border-r border-white/8 bg-[#0d1117]"
            >
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 px-3">
                <FolderOpen className="size-3.5 text-[#6e7681]" strokeWidth={1.75} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6e7681]">Files</span>
              </div>
              <div className="flex-1 overflow-y-auto py-1.5">
                {fileTree.map((n) => <FileTreeNode key={n.name} node={n} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main: phases or code view */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {showCode ? (
            // Code streaming view
            <div className="flex h-full flex-col overflow-hidden bg-[#0d1117]">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 px-4">
                <Eye className="size-3.5 text-[#6e7681]" strokeWidth={1.75} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6e7681]">
                  Live generation
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeStream active={true} />
              </div>
            </div>
          ) : (
            // Phase cards view
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
                {PHASES.map((phase, idx) => {
                  const status = phaseStatuses[phase.id];
                  const PhaseIcon = phase.icon;
                  const cards = visibleCards[phase.id] ?? 0;
                  const isActive = status === "active";
                  const isDone = status === "done";
                  const isPending = status === "pending";

                  return (
                    <motion.div
                      key={phase.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{
                        opacity: isPending ? 0.35 : 1,
                        y: 0,
                      }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      {/* Phase header */}
                      <div className="mb-4 flex items-center gap-3">
                        <div className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl transition",
                          isDone ? "bg-positive/10" : isActive ? "bg-accent/10" : "bg-muted/50",
                        )}>
                          {isDone
                            ? <CheckCircle2 className="size-4 text-positive" strokeWidth={2} />
                            : isActive
                              ? <Loader2 className={cn("size-4 animate-spin", phase.color)} strokeWidth={2} />
                              : <Circle className="size-4 text-muted-foreground/30" strokeWidth={1.5} />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-[13.5px] font-semibold",
                            isDone ? "text-foreground" : isActive ? "text-foreground" : "text-muted-foreground/50",
                          )}>
                            {phase.label}
                          </p>
                          {(isActive || isDone) && (
                            <p className="text-[12px] text-muted-foreground">{phase.description}</p>
                          )}
                        </div>
                        {isActive && (
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">
                            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                            Live
                          </div>
                        )}
                      </div>

                      {/* Phase cards */}
                      {(isActive || isDone) && (
                        <div className="grid grid-cols-2 gap-2 pl-11 sm:grid-cols-4">
                          {phase.cards.map((card, ci) => (
                            <AnimatePresence key={card}>
                              {ci < cards && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                  className={cn(
                                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px] font-medium",
                                    isDone
                                      ? "border-positive/20 bg-positive/5 text-positive"
                                      : "border-accent/20 bg-accent/5 text-accent",
                                  )}
                                >
                                  {isDone
                                    ? <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.5} />
                                    : <Loader2 className="size-3.5 shrink-0 animate-spin" strokeWidth={2} />}
                                  {card}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Completion state */}
                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="rounded-2xl border border-positive/20 bg-positive/5 p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-positive/10">
                          <CheckCircle2 className="size-5 text-positive" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] font-semibold text-foreground">Your app is ready</p>
                          <p className="mt-1 text-[13px] text-muted-foreground">
                            All systems generated successfully. Open the workspace to explore pages, components, backend, and deployments.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="accent"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => router.push("/projects")}
                            >
                              <Sparkles className="size-3.5" strokeWidth={1.75} />
                              Open workspace
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => router.push("/")}
                            >
                              <Globe className="size-3.5" strokeWidth={1.75} />
                              Create another app
                            </Button>
                          </div>
                        </div>
                        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">Mode</p>
                            <p className="text-[12px] font-medium text-foreground">{modeLabel}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">Phases</p>
                            <p className="text-[13px] font-semibold text-foreground flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-positive" strokeWidth={2} />
                              {PHASES.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right: phase overview strip */}
        <div className="hidden w-44 shrink-0 flex-col border-l border-border bg-background/60 xl:flex">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Phases
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {PHASES.map((phase) => {
              const status = phaseStatuses[phase.id];
              const Icon = phase.icon;
              return (
                <div key={phase.id} className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-[11.5px] transition",
                  status === "active" ? "bg-accent/8 text-foreground" : "",
                  status === "done" ? "text-muted-foreground" : "",
                  status === "pending" ? "text-muted-foreground/35" : "",
                )}>
                  {status === "done" && <CheckCircle2 className="size-3.5 shrink-0 text-positive" strokeWidth={2.5} />}
                  {status === "active" && <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" strokeWidth={2} />}
                  {status === "pending" && <Circle className="size-3.5 shrink-0 text-muted-foreground/25" strokeWidth={1.5} />}
                  <span className="truncate">{phase.label}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-3">
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Mode</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Cpu className="size-3" strokeWidth={1.75} />
                  {modeLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Stack</span>
                <span className="font-medium text-foreground">Next.js</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
