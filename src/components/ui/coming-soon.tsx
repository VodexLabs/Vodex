"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { variants } from "@/lib/motion";

// ─── Roadmap phase badge ──────────────────────────────────────────────────────

type Phase = "q3-2026" | "q4-2026" | "2027" | "beta";

const phaseLabels: Record<Phase, { label: string; color: string }> = {
  "q3-2026": { label: "Q3 2026", color: "#1e6bff" },
  "q4-2026": { label: "Q4 2026", color: "#7c3aed" },
  "2027":    { label: "2027",    color: "#9333ea" },
  "beta":    { label: "Beta",    color: "#059669" },
};

// ─── Roadmap item ─────────────────────────────────────────────────────────────

export interface RoadmapItem {
  label: string;
  phase: Phase;
  desc?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ComingSoonProps {
  /** Section title */
  title: string;
  /** One-line description */
  description: string;
  /** The feature category icon */
  icon?: LucideIcon;
  /** Accent color */
  accentColor?: string;
  /** Specific roadmap items to show */
  roadmap?: RoadmapItem[];
  /** Compact mode — smaller, inline */
  compact?: boolean;
  /** Link to a changelog or preview page */
  learnHref?: string;
}

// ─── Shimmer animation ────────────────────────────────────────────────────────

function ShimmerBar({ delay = 0, width = "100%" }: { delay?: number; width?: string }) {
  return (
    <div
      className="relative h-2 overflow-hidden rounded-full bg-muted/50"
      style={{ width }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent"
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 2.2, delay, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComingSoon({
  title,
  description,
  icon: Icon = Sparkles,
  accentColor = "var(--accent)",
  roadmap,
  compact = false,
  learnHref,
}: ComingSoonProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{ background: `color-mix(in oklab, ${accentColor} 14%, transparent)` }}
        >
          <Icon className="size-4" strokeWidth={1.65} style={{ color: accentColor }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="truncate text-[12px] text-muted-foreground">{description}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: `color-mix(in oklab, ${accentColor} 12%, transparent)`,
            color: accentColor,
          }}
        >
          Coming soon
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={variants.fadeUp}
      initial="hidden"
      animate="show"
      className="relative mx-auto flex max-w-2xl flex-col items-center py-16 text-center"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)]"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, ${accentColor} 10%, transparent), transparent)`,
        }}
      />

      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-7 flex size-20 items-center justify-center rounded-[var(--radius-xl)]"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${accentColor} 20%, transparent), color-mix(in oklab, ${accentColor} 8%, transparent))`,
          boxShadow: `0 0 0 1px color-mix(in oklab, ${accentColor} 25%, transparent), 0 8px 32px color-mix(in oklab, ${accentColor} 16%, transparent)`,
        }}
      >
        <Icon className="size-9" strokeWidth={1.4} style={{ color: accentColor }} />

        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-[var(--radius-xl)]"
          style={{ border: `1px solid color-mix(in oklab, ${accentColor} 30%, transparent)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Label */}
      <div
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{
          background: `color-mix(in oklab, ${accentColor} 10%, transparent)`,
          color: accentColor,
          border: `1px solid color-mix(in oklab, ${accentColor} 20%, transparent)`,
        }}
      >
        <span className="size-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
        Coming Soon
      </div>

      {/* Title & description */}
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-foreground">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* Shimmer preview bars (simulated UI) */}
      <div className="mt-8 w-full space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface/60 p-6">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-[var(--radius-md)] bg-muted/50" />
          <div className="flex-1 space-y-2">
            <ShimmerBar delay={0} width="65%" />
            <ShimmerBar delay={0.4} width="40%" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-[var(--radius-md)] bg-muted/50" />
          <div className="flex-1 space-y-2">
            <ShimmerBar delay={0.2} width="55%" />
            <ShimmerBar delay={0.6} width="35%" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-[var(--radius-md)] bg-muted/50" />
          <div className="flex-1 space-y-2">
            <ShimmerBar delay={0.4} width="70%" />
            <ShimmerBar delay={0.8} width="45%" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: accentColor, opacity: 0.6 }}
          >
            Preview coming soon
          </span>
        </div>
      </div>

      {/* Roadmap */}
      {roadmap && roadmap.length > 0 && (
        <div className="mt-8 w-full">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Roadmap
          </p>
          <div className="flex flex-col gap-2">
            {roadmap.map((item, i) => {
              const phase = phaseLabels[item.phase];
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-left"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: phase.color }}
                  />
                  <span className="flex-1 text-[13px] text-foreground">{item.label}</span>
                  {item.desc && (
                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                      {item.desc}
                    </span>
                  )}
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: `color-mix(in oklab, ${phase.color} 12%, transparent)`,
                      color: phase.color,
                    }}
                  >
                    {phase.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="accent" size="md">
          <Sparkles className="size-4" strokeWidth={1.75} />
          Notify me when live
        </Button>
        {learnHref && (
          <Button variant="secondary" size="md" asChild>
            <Link href={learnHref}>
              See roadmap
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>
        )}
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground/50">
        We ship fast. Follow{" "}
        <span className="text-muted-foreground">@DreamOS86</span> for updates.
      </p>
    </motion.div>
  );
}
