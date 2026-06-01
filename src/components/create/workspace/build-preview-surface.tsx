"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";
import { cn } from "@/lib/utils";

export type PreviewShellState = "idle" | "building" | "compiling";

export function BuildPreviewSurface({
  state,
  appName,
  className,
}: {
  state: PreviewShellState;
  appName?: string | null;
  currentStep?: string | null;
  stepIndex?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex h-full w-full flex-col overflow-hidden bg-[#f6f9ff]",
        className,
      )}
      data-testid="preview-build-loading-beautiful"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_18%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-[radial-gradient(90%_80%_at_50%_100%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)]" />

      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[40%] size-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-accent/20"
          animate={{ opacity: state === "idle" ? 0 : [0, 0.35, 0], scale: [0.55, 1.2, 1.5] }}
          transition={{
            duration: 2.4,
            repeat: state === "idle" ? 0 : Infinity,
            ease: "easeOut",
            delay: i * 0.6,
          }}
        />
      ))}

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[12%] top-[22%] h-16 w-28 rounded-full bg-white/50 blur-2xl"
        animate={{ x: [0, 24, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[10%] top-[30%] h-20 w-32 rounded-full bg-accent/15 blur-2xl"
        animate={{ x: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <motion.div
          className="relative flex size-[96px] items-center justify-center rounded-[1.4rem] shadow-[0_24px_60px_-24px_rgba(30,107,255,0.55)] ring-2 ring-white/85"
          animate={state === "idle" ? {} : { scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: state === "idle" ? 0 : Infinity, ease: "easeInOut" }}
        >
          <VodexBrandIcon variant="previewHero" className="drop-shadow-md" alt="Vodex" />
        </motion.div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/90">
            Vodex
          </p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {state === "idle"
              ? "Ready to architect, build, and deploy."
              : "Building your app"}
          </p>
          {state !== "idle" && (
            <p className="mt-2 text-sm text-muted-foreground">This usually takes a moment.</p>
          )}
        </div>
        {state !== "idle" && (
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
