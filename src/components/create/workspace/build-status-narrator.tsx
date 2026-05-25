"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, LayoutDashboard, Palette, Database, Plug, Monitor, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DreamOS86BrandIcon } from "@/components/brand/dreamos86-brand-icon";

const STEPS: Array<{
  label: string;
  description: string;
  icon?: LucideIcon;
  brandIcon?: boolean;
}> = [
  { label: "Understanding your app", description: "Learning what you want to build", icon: LayoutDashboard },
  { label: "Creating app plan", description: "Organizing screens and features", brandIcon: true },
  { label: "Designing screens", description: "Layout and visual structure", icon: Palette },
  { label: "Creating data structure", description: "How your app stores information", icon: Database },
  { label: "Building the interface", description: "Turning the plan into UI", icon: Palette },
  { label: "Connecting actions", description: "Email, payments, and app behaviors", icon: Plug },
  { label: "Checking quality", description: "Making sure everything works", icon: Monitor },
  { label: "Preparing preview", description: "Getting your app ready to try", icon: Monitor },
] as const;

interface Props {
  isStreaming: boolean;
  className?: string;
  /** 0-based active step while streaming */
  activeStep?: number;
  /** Server is running post-build quality repair */
  qualityRepairing?: boolean;
}

export function BuildStatusNarrator({
  isStreaming,
  className,
  activeStep = 0,
  qualityRepairing = false,
}: Props) {
  const [tick, setTick] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isStreaming) {
      setVisible(true);
      const id = setInterval(() => setTick((t) => t + 1), activeStep <= 0 ? 1800 : 2400);
      return () => clearInterval(id);
    }
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [isStreaming, activeStep]);

  const index = isStreaming ? (activeStep >= 0 ? activeStep : tick) % STEPS.length : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={cn("space-y-1.5 px-2", className)}
        >
          {qualityRepairing && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 ring-1 ring-amber-500/25">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-600" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-foreground">Fixing errors automatically…</p>
                <p className="text-[10.5px] text-muted-foreground">Running a quality repair pass on your preview</p>
              </div>
            </div>
          )}
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const status = i < index ? "done" : i === index ? "active" : "pending";
            return (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1 transition",
                  status === "active" &&
                    "bg-accent/[0.1] ring-accent/35 shadow-[0_0_16px_-6px_hsl(var(--accent)/0.45)]",
                  status === "done" && "bg-surface/80 ring-border/70",
                  status === "pending" && "opacity-50 ring-border/40",
                )}
              >
                {status === "done" ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" strokeWidth={1.75} />
                ) : status === "active" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" strokeWidth={2} />
                ) : step.brandIcon ? (
                  <DreamOS86BrandIcon variant="assistant" className="shrink-0 opacity-90" alt="" />
                ) : Icon ? (
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-foreground">{step.label}</p>
                  {status === "active" && (
                    <p className="text-[10.5px] text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
