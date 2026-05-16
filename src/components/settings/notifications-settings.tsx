"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { variants } from "@/lib/motion";

export function NotificationsSettings() {
  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div
        variants={variants.fadeUp}
        className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface px-6 py-16 text-center ring-1 ring-border"
      >
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border">
          <Bell className="size-7 text-muted-foreground/50" strokeWidth={1.35} />
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">Notifications — Coming Soon</h2>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          A full notification system is on the roadmap. You&apos;ll be able to configure
          in-app alerts, deploy notifications, credit warnings, and team events — all
          in one place.
        </p>
        <span className="mt-5 inline-flex rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
          In development
        </span>
      </motion.div>
    </motion.div>
  );
}
