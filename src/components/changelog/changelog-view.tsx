"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { changelog } from "@/lib/data";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const typeConfig = {
  major: { label: "Major", color: "bg-accent text-white" },
  minor: { label: "Minor", color: "bg-positive/20 text-positive" },
  patch: { label: "Patch", color: "bg-muted/60 text-muted-foreground" },
};

export function ChangelogView() {
  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_68%)] blur-3xl" />

      <motion.div variants={variants.fadeUp} initial="hidden" animate="show" className="relative flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">CHANGELOG</p>
          <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold tracking-[-0.055em] text-foreground">
            What&apos;s new in Vodex
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Notable releases and fixes from roughly the last five months of building. Product updates for your account
            are delivered in-app and over email when you sign up — no separate changelog mailing list.
          </p>
        </div>
      </motion.div>

      <div className="relative mt-12 pl-4">
        <div className="absolute bottom-4 left-0 top-2 w-px bg-border" />

        <motion.div variants={variants.staggerContainer} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="space-y-12">
          {changelog.map((entry, i) => {
            const config = typeConfig[entry.type];
            return (
              <motion.div key={entry.id} variants={variants.staggerItem} className="relative pl-8">
                <div className={cn(
                  "absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-2 ring-background",
                  entry.type === "major" ? "bg-accent" : entry.type === "minor" ? "bg-positive" : "bg-muted-foreground/40",
                )} />

                <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)] ring-1 ring-border">
                  <div className={cn("px-6 pt-6", i === 0 && "bg-gradient-to-r from-accent/5 to-transparent")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", config.color)}>
                        {config.label}
                      </span>
                      <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground ring-1 ring-border">
                        v{entry.version}
                      </span>
                      {i === 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-positive/15 px-2 py-0.5 text-[11px] font-semibold text-positive">
                          <Sparkles className="size-2.5" strokeWidth={2} />
                          Latest
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-[18px] font-semibold tracking-[-0.04em] text-foreground">
                      {entry.title}
                    </h2>
                    <p className="mt-1 text-[12px] text-muted-foreground">{entry.date}</p>
                  </div>

                  <div className="px-6 pb-6 pt-4">
                    <p className="text-[14px] leading-relaxed text-muted-foreground">{entry.description}</p>
                    <ul className="mt-4 space-y-2">
                      {entry.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-[13px] text-foreground">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.4 }} className="relative mt-12 rounded-[var(--radius-xl)] bg-gradient-to-br from-accent/6 to-transparent p-6 text-center ring-1 ring-accent/15">
        <Sparkles className="mx-auto size-5 text-accent" strokeWidth={1.65} />
        <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground">Coming next</h3>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {["Paid checkout (Starter+)", "Live collaboration cursors", "Deeper Cursor / repo sync", "Usage export API"].map((feature) => (
            <span key={feature} className="rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-muted-foreground ring-1 ring-border">
              {feature}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
