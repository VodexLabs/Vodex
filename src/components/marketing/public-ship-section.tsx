"use client";

import { motion } from "framer-motion";
import { WhyDreamOsFeatures } from "@/components/os-home/why-dreamos-section";

/** Public landing — ship faster block with visual mockups (no fake stats). */
export function PublicShipSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.45 }}
      className="mx-auto mt-16 max-w-5xl"
    >
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/80">
          Ship faster
        </p>
        <h2 className="mt-2 text-balance text-[26px] font-semibold tracking-tight text-foreground sm:text-[32px]">
          Now you can ship software within minutes — not months
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          One prompt becomes a saved project, hosted preview, and a path to publish when you are ready.
        </p>
      </div>
      <div className="mt-8">
        <WhyDreamOsFeatures />
      </div>
    </motion.section>
  );
}
