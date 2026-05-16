"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import { getRecentApps } from "@/config/apps";
import { AppCard } from "@/components/apps/app-card";
import { EmptyState } from "@/components/ui/empty-state";
import { variants } from "@/lib/motion";

export function RecentApps() {
  const recent = getRecentApps();

  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-0">
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-12% 0px" }}
        className="flex items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
            RECENT
          </p>
          <h2 className="mt-3 text-balance text-[22px] font-semibold tracking-[-0.045em] text-foreground sm:text-[28px]">
            Return to something alive
          </h2>
        </div>
        <Link
          href="/projects"
          className="hidden items-center gap-1 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
        >
          View all
          <ArrowUpRight className="size-4" strokeWidth={1.65} />
        </Link>
      </motion.div>

      {recent.length ? (
        <motion.div
          variants={variants.staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-8% 0px" }}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {recent.map((app) => (
            <motion.div key={app.id} variants={variants.staggerItem}>
              <AppCard app={app} layout="compact" />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={<Layers className="size-6" strokeWidth={1.55} />}
            title="No apps yet"
            description="Your first creation will appear here — luminous, fast to reopen, effortless to evolve."
            action={{ label: "Start with a template" }}
          />
        </div>
      )}
    </section>
  );
}
