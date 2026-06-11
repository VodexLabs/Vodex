"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GitBranch } from "lucide-react";
import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";
import { cn } from "@/lib/utils";

export type PreviewShellState = "idle" | "building" | "compiling";

export type BuildPreviewVariant = "default" | "github";

export function BuildPreviewSurface({
  state,
  appName,
  variant = "default",
  githubPhase = "fetching",
  className,
}: {
  state: PreviewShellState;
  appName?: string | null;
  currentStep?: string | null;
  stepIndex?: number;
  variant?: BuildPreviewVariant;
  /** Only used when variant is github */
  githubPhase?: "fetching" | "success";
  className?: string;
}) {
  const active = state !== "idle";
  const showGithub = variant === "github" && active;

  return (
    <div
      className={cn(
        "relative isolate flex h-full w-full flex-col overflow-hidden bg-[#f6f9ff]",
        className,
      )}
      data-testid="preview-build-loading-beautiful"
      data-preview-shell-variant={variant}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_18%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-[radial-gradient(90%_80%_at_50%_100%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)]" />

      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[40%] size-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-accent/20"
          animate={{ opacity: active ? [0, 0.35, 0] : 0, scale: [0.55, 1.2, 1.5] }}
          transition={{
            duration: 2.4,
            repeat: active ? Infinity : 0,
            ease: "easeOut",
            delay: i * 0.6,
          }}
        />
      ))}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        {showGithub ? (
          <div className="flex flex-col items-center gap-5">
            <motion.div
              className="flex size-14 items-center justify-center rounded-2xl bg-[#24292f] text-white shadow-lg ring-1 ring-black/10"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <GitBranch className="size-7" strokeWidth={1.75} />
            </motion.div>
            <div className="flex flex-col items-center gap-1 text-muted-foreground/70">
              <ChevronDown className="size-4 animate-bounce" strokeWidth={2} />
              <ChevronDown className="-mt-2 size-4 animate-bounce" strokeWidth={2} style={{ animationDelay: "120ms" }} />
            </div>
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <VodexBrandIcon variant="previewHero" className="drop-shadow-md" alt="Vodex" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.p
                key={githubPhase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {githubPhase === "success"
                  ? "Code synced from GitHub"
                  : "Fetching your code from GitHub"}
              </motion.p>
            </AnimatePresence>
            {githubPhase === "fetching" && (
              <p className="text-sm text-muted-foreground">Pulling your repository into the preview workspace…</p>
            )}
          </div>
        ) : (
          <>
            <motion.div
              className="relative flex size-[96px] items-center justify-center rounded-[1.4rem] shadow-[0_24px_60px_-24px_rgba(30,107,255,0.55)] ring-2 ring-white/85"
              animate={active ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 2.2, repeat: active ? Infinity : 0, ease: "easeInOut" }}
            >
              <VodexBrandIcon variant="previewHero" className="drop-shadow-md" alt="Vodex" />
            </motion.div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/90">
                Vodex
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {active
                  ? appName?.trim()
                    ? `Building ${appName.trim()}`
                    : "Building your app"
                  : "Ready to architect, build, and deploy."}
              </p>
              {active && (
                <p className="mt-2 text-sm text-muted-foreground">This usually takes a moment.</p>
              )}
            </div>
          </>
        )}

        {active && (
          <div className="h-1 w-40 overflow-hidden rounded-full bg-accent/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent/40 via-accent to-accent/40"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "50%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
