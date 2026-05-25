"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  Hammer,
  MonitorSmartphone,
  Globe,
  CheckCircle2,
  Sparkles,
  Copy,
  Package,
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPublicAppRootDomain } from "@/lib/publish/publish-config";

const STEPS = [
  { id: "describe", label: "Describe", icon: MessageSquare, accent: "hsl(var(--accent))" },
  { id: "build", label: "Build", icon: Hammer, accent: "hsl(199 89% 48%)" },
  { id: "preview", label: "Preview", icon: MonitorSmartphone, accent: "hsl(152 69% 40%)" },
  { id: "publish", label: "Publish", icon: Globe, accent: "hsl(221 83% 53%)" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const ROTATE_MS = 3000;
const RESUME_AFTER_MS = 6000;
const PROMPT = "Create me a management food inventory app for my restaurant.";

function StepProgressRing({ active, color, reduce }: { active: boolean; color: string; reduce: boolean }) {
  if (reduce || !active) return null;
  return (
    <svg className="pointer-events-none absolute inset-1 size-[calc(100%-8px)] -rotate-90" viewBox="0 0 100 100" aria-hidden>
      <motion.circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

function useTypingPrompt(active: boolean) {
  const reduce = useReducedMotion();
  const [text, setText] = React.useState(reduce ? PROMPT : "");
  const [badge, setBadge] = React.useState(!!reduce);

  React.useEffect(() => {
    if (reduce || !active) return;
    setText("");
    setBadge(false);
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setText(PROMPT.slice(0, i));
      if (i >= PROMPT.length) {
        window.clearInterval(t);
        window.setTimeout(() => setBadge(true), 350);
      }
    }, 45);
    return () => window.clearInterval(t);
  }, [active, reduce]);

  return { text, badge, reduce: !!reduce };
}

function DescribeDemo({ active }: { active: boolean }) {
  const { text, badge, reduce } = useTypingPrompt(active);
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.08] via-background to-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-accent/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Your prompt</p>
        <p className="mt-2 min-h-[24px] text-[15px] font-medium leading-snug text-foreground">
          {text}
          {!reduce && text.length < PROMPT.length ? (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent" />
          ) : null}
        </p>
      </div>
      <AnimatePresence>
        {badge ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-4" />
            Build request detected — starting generation
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="text-[11px] text-muted-foreground">Questions stay in chat. No project or credits until you confirm build.</p>
    </div>
  );
}

const BUILD_ACTIVITIES = [
  { label: "Building", hint: "Viewing dashboard layout" },
  { label: "Editing", hint: "Updating inventory table" },
  { label: "Checking files", hint: "Adding supplier and category fields" },
  { label: "Running quality checks", hint: "Validating low-stock alerts and filters" },
  { label: "Preparing preview", hint: "Finalizing restaurant inventory screens" },
] as const;

const BUILD_SUMMARY = [
  { label: "Pages created", value: "Dashboard · Inventory · Suppliers" },
  { label: "Data organized", value: "Items · Categories · Stock levels" },
  { label: "Key features", value: "Low-stock alerts · Reorder tracking" },
  { label: "Preview ready", value: "Live sandbox available" },
] as const;

function BuildDemo({ active }: { active: boolean }) {
  const [lit, setLit] = React.useState(0);
  const reduce = useReducedMotion();
  const complete = lit >= BUILD_ACTIVITIES.length;

  React.useEffect(() => {
    if (reduce || !active) return;
    setLit(0);
    let s = 0;
    const t = window.setInterval(() => {
      s += 1;
      setLit(s);
      if (s >= BUILD_ACTIVITIES.length) window.clearInterval(t);
    }, 650);
    return () => window.clearInterval(t);
  }, [active, reduce]);

  React.useEffect(() => {
    if (reduce && active) setLit(BUILD_ACTIVITIES.length);
  }, [reduce, active]);

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Build in progress</p>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[9px] font-semibold text-accent">Live generation</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-white/90 via-background to-accent/[0.04] p-4 shadow-sm ring-1 ring-border/50 dark:from-white/[0.04]">
        <div className="space-y-2">
          {BUILD_ACTIVITIES.map((activity, i) => {
            const done = i < lit;
            const current = i === lit - 1 || (lit === 0 && i === 0 && !complete);
            const visible = done || current;

            return (
              <motion.div
                key={activity.label}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.05 }}
                className={cn(
                  "relative overflow-hidden rounded-xl border px-3.5 py-3 transition-all duration-300",
                  done
                    ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                    : current
                      ? "border-accent/25 bg-accent/[0.06] shadow-[0_0_0_1px_hsl(var(--accent)/0.08)]"
                      : "border-border/40 bg-background/50 opacity-60",
                )}
              >
                {current && !reduce ? (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent"
                    layoutId="build-active-indicator"
                    transition={{ duration: 0.3 }}
                  />
                ) : null}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                      done
                        ? "bg-emerald-500 text-white"
                        : current
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? "✓" : current && !reduce ? (
                      <span className="size-2 animate-pulse rounded-full bg-accent" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[12px] font-semibold tracking-tight",
                        done || current ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {activity.label}
                    </p>
                    {visible ? (
                      <motion.p
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-0.5 text-[10px] text-muted-foreground/80"
                      >
                        {activity.hint}
                      </motion.p>
                    ) : null}
                  </div>
                  {current && !done && !reduce ? (
                    <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-accent/70">Active</span>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {complete ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-background p-3.5 ring-1 ring-emerald-500/15"
            >
              <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Build complete
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {BUILD_SUMMARY.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : i * 0.08 }}
                    className="rounded-lg bg-background/70 px-2.5 py-2 ring-1 ring-border/50"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-foreground">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RestaurantInventoryPreviewMock() {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Inventory", icon: ClipboardList, active: false },
    { label: "Suppliers", icon: Package, active: false },
  ];

  const inventoryRows = [
    { item: "Chicken breast", qty: "24 lb", status: "ok" as const },
    { item: "Roma tomatoes", qty: "8 lb", status: "low" as const },
    { item: "Olive oil", qty: "3 gal", status: "low" as const },
    { item: "Basil (fresh)", qty: "2 lb", status: "critical" as const },
  ];

  return (
    <div className="flex min-h-[240px]">
      <aside className="hidden w-[92px] shrink-0 flex-col gap-1 border-r border-orange-500/10 bg-orange-500/[0.04] p-2 sm:flex">
        {navItems.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[8px] font-semibold",
              active ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "text-muted-foreground",
            )}
          >
            <Icon className="size-2.5 shrink-0" strokeWidth={2} />
            {label}
          </div>
        ))}
      </aside>
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-foreground">FoodFlow Inventory</p>
            <p className="text-[8px] text-muted-foreground">Bella Cucina · Kitchen stock</p>
          </div>
          <Package className="size-3.5 text-orange-600" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Total items", val: "186" },
            { label: "Low stock", val: "7" },
            { label: "Reorder due", val: "3" },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl bg-white/90 p-2 ring-1 ring-orange-500/10 dark:bg-white/5">
              <p className="text-[13px] font-bold tabular-nums text-foreground">{val}</p>
              <p className="text-[8px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-amber-500/[0.08] px-2.5 py-2 ring-1 ring-amber-500/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-amber-600" />
            <p className="text-[9px] font-semibold text-amber-800 dark:text-amber-300">Low-stock alerts</p>
          </div>
          <p className="mt-1 text-[8px] text-amber-700/80 dark:text-amber-400/80">Basil, tomatoes, and olive oil need reorder</p>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl bg-white/80 ring-1 ring-border/50 dark:bg-white/5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border/40 bg-muted/30 px-2.5 py-1.5 text-[7px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Item</span>
            <span>On hand</span>
            <span>Status</span>
          </div>
          {inventoryRows.map((row) => (
            <div
              key={row.item}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border/30 px-2.5 py-1.5 last:border-0"
            >
              <span className="truncate text-[9px] font-medium text-foreground">{row.item}</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">{row.qty}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[7px] font-semibold uppercase",
                  row.status === "ok"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : row.status === "low"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400",
                )}
              >
                {row.status === "ok" ? "OK" : row.status === "low" ? "Low" : "Critical"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewDemo() {
  const [viewport, setViewport] = React.useState<"desktop" | "mobile">("desktop");

  return (
    <div className="space-y-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["desktop", "mobile"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setViewport(v)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize transition",
              viewport === v ? "bg-accent text-white shadow-sm" : "bg-surface text-muted-foreground ring-1 ring-border",
            )}
          >
            {v}
          </button>
        ))}
        <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">Preview ready</span>
        <span className="ml-auto rounded-lg bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">Quality 94</span>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-accent/[0.05] via-background to-orange-500/[0.04] shadow-lg ring-1 ring-accent/10 transition-all",
          viewport === "mobile" ? "mx-auto max-w-[280px]" : "max-w-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 bg-background/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            <span className="text-[10px] font-semibold text-foreground">Live preview</span>
          </div>
          <span className="text-[9px] text-muted-foreground">Sandbox · not yet published</span>
        </div>
        <div className="p-2.5">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-white/90 shadow-inner dark:bg-[#12141c]/90">
            <RestaurantInventoryPreviewMock />
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishDemo() {
  const reduce = useReducedMotion();
  const [published, setPublished] = React.useState(reduce);
  const [copied, setCopied] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const publicUrl = `https://foodflow-inventory.${getPublicAppRootDomain()}`;

  React.useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => {
      setPublishing(true);
      window.setTimeout(() => {
        setPublishing(false);
        setPublished(true);
      }, 1200);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [reduce]);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-accent/[0.06] via-background to-blue-500/[0.04] p-4 ring-1 ring-accent/10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
              published
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : publishing
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {published ? "Live" : publishing ? "Publishing…" : "Preview ready"}
          </span>
          {published ? (
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              SSL active · globally available
            </motion.span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/80 px-3 py-2.5 ring-1 ring-border/50">
          <Globe className="size-4 shrink-0 text-accent" />
          <span className="min-w-0 truncate font-mono text-[13px] font-semibold text-accent">{publicUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-auto flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent transition hover:bg-accent/20"
            aria-label="Copy link"
          >
            {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          {published
            ? "Your restaurant inventory app is live and shareable."
            : "One click to publish on your custom subdomain."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          animate={
            published && !reduce
              ? { scale: [1, 1.05, 1] }
              : publishing && !reduce
                ? { scale: [1, 0.98, 1] }
                : undefined
          }
          transition={{ duration: 0.45 }}
          className={cn(
            "rounded-lg px-4 py-2 text-[11px] font-semibold text-white shadow-md transition",
            published
              ? "bg-emerald-600"
              : "bg-gradient-to-r from-blue-600 to-violet-600",
          )}
        >
          {published ? "Published" : publishing ? "Publishing…" : "Publish app"}
        </motion.button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-border px-4 py-2 text-[11px] font-semibold text-foreground transition hover:bg-muted/50"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        {publishing && !published && !reduce ? (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
            Deploying to edge…
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StepContent({ stepId, describeActive }: { stepId: StepId; describeActive: boolean }) {
  switch (stepId) {
    case "describe":
      return <DescribeDemo active={describeActive} />;
    case "build":
      return <BuildDemo active />;
    case "preview":
      return <PreviewDemo />;
    case "publish":
      return <PublishDemo />;
    default:
      return null;
  }
}

export function HowItWorksDemo() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const resumeRef = React.useRef<number | null>(null);

  const scheduleResume = React.useCallback(() => {
    if (resumeRef.current) window.clearTimeout(resumeRef.current);
    resumeRef.current = window.setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  }, []);

  const onStepClick = (i: number) => {
    setActive(i);
    setPaused(true);
    scheduleResume();
  };

  React.useEffect(() => {
    if (reduce || paused) return;
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [reduce, paused]);

  React.useEffect(
    () => () => {
      if (resumeRef.current) window.clearTimeout(resumeRef.current);
    },
    [],
  );

  const step = STEPS[active];

  return (
    <section data-testid="how-it-works-demo" className="mx-auto mt-20 max-w-5xl px-4 sm:px-0">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">How it works</p>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground sm:text-[32px]">From idea to live app</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted-foreground">
          A guided workflow that keeps you in control from the first prompt to the final preview.
        </p>
      </div>

      <div
        className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`how-step-${s.id}`}
              aria-current={isActive ? "step" : undefined}
              onClick={() => onStepClick(i)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition-all duration-300",
                isActive
                  ? "scale-[1.02] border-accent/40 bg-accent/10 shadow-[0_8px_32px_-12px_hsl(var(--accent)/0.45)]"
                  : "border-border/60 bg-background/70 hover:border-accent/25 hover:bg-accent/[0.03]",
              )}
            >
              <StepProgressRing active={isActive} color={s.accent} reduce={!!reduce} />
              <s.icon
                className={cn("relative size-5 transition-colors", isActive ? "text-accent" : "text-muted-foreground")}
                style={isActive ? { color: s.accent } : undefined}
                strokeWidth={1.75}
              />
              <span className={cn("relative text-[11px] font-semibold sm:text-[12px]", isActive ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="relative mt-8 overflow-hidden rounded-[20px] border border-border/60 bg-gradient-to-b from-background via-surface/40 to-background p-1 shadow-[0_40px_80px_-48px_hsl(var(--accent)/0.35)] ring-1 ring-accent/10"
        style={{ boxShadow: `0 40px 80px -48px ${step.accent}55` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: `radial-gradient(ellipse 85% 55% at 50% 0%, ${step.accent}20, transparent 72%)` }}
        />
        <div className="relative min-h-[280px] overflow-hidden rounded-[16px] bg-background/95 backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <StepContent stepId={step.id} describeActive={!paused || !!reduce} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
