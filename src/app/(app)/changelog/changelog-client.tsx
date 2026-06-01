"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { variants, transition } from "@/lib/motion";
import type { ChangelogEntry } from "@/lib/data";

// ─── Type badge config ────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  major: { label: "Major", className: "bg-accent-muted text-accent ring-1 ring-accent/20" },
  minor: { label: "Minor", className: "bg-positive-muted text-positive ring-1 ring-positive/20" },
  patch: { label: "Patch", className: "bg-muted text-muted-foreground ring-1 ring-border" },
} as const;

// ─── Entry ────────────────────────────────────────────────────────────────────

function ChangelogEntryCard({ entry, isFirst }: { entry: ChangelogEntry; isFirst: boolean }) {
  const typeConfig = TYPE_CONFIG[entry.type];

  return (
    <motion.div
      variants={variants.staggerItem}
      className="flex gap-6 md:gap-10"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0 w-5">
        <div className={cn(
          "w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-background shrink-0 mt-0.5",
          entry.type === "major"
            ? "bg-accent ring-accent"
            : entry.type === "minor"
            ? "bg-positive ring-positive"
            : "bg-muted-foreground ring-border",
        )} />
        <div className="flex-1 w-px bg-border mt-3" />
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 pb-12",
        isFirst && "rounded-[var(--radius-xl)] bg-[var(--surface)] ring-1 ring-border shadow-[var(--shadow-glass)] px-6 py-6 mb-4",
      )}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4 flex-wrap">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", typeConfig.className)}>
            {typeConfig.label}
          </span>
          <span className="text-[12px] font-mono text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full ring-1 ring-border">
            v{entry.version}
          </span>
          {isFirst && (
            <span className="text-[11px] bg-accent text-white px-2.5 py-0.5 rounded-full font-medium">
              Latest
            </span>
          )}
          <span className="text-[12px] text-muted-foreground ml-auto">{entry.date}</span>
        </div>

        {/* Title */}
        <h2 className={cn("font-semibold text-foreground mb-2", isFirst ? "text-xl" : "text-base")}>
          {entry.title}
        </h2>

        {/* Description */}
        <p className={cn("text-muted-foreground leading-relaxed mb-5", isFirst ? "text-sm" : "text-[13px]")}>
          {entry.description}
        </p>

        {/* Highlights */}
        <ul className="flex flex-col gap-2">
          {entry.highlights.map((highlight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground">
              <span className={cn(
                "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                entry.type === "major" ? "bg-accent" : entry.type === "minor" ? "bg-positive" : "bg-muted-foreground",
              )} />
              {highlight}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ─── What's Next ──────────────────────────────────────────────────────────────

const UPCOMING = [
  { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", title: "Multi-page Apps", desc: "Build complex, multi-screen applications with shared state and navigation." },
  { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", title: "Guest Collaboration", desc: "Share apps with external stakeholders for live feedback and co-editing." },
  { icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125", title: "Persistent Databases", desc: "Attach Supabase or built-in storage directly to generated apps." },
];

// ─── Client Component ─────────────────────────────────────────────────────────

export function ChangelogClient({ entries }: { entries: ChangelogEntry[] }) {
  const [subscribed, setSubscribed] = useState(false);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={variants.staggerContainer}
      className="px-[var(--page-padding-x)] py-[var(--page-padding-y)] flex flex-col gap-8 max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={variants.fadeUp} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Changelog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every update, improvement, and new feature in Vodex.</p>
        </div>
        <Button
          variant={subscribed ? "secondary" : "accent"}
          size="sm"
          onClick={() => setSubscribed((s) => !s)}
        >
          {subscribed ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Subscribed
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              Subscribe to updates
            </>
          )}
        </Button>
      </motion.div>

      {/* Timeline */}
      <motion.div variants={variants.staggerContainer} className="flex flex-col">
        {entries.map((entry, i) => (
          <ChangelogEntryCard key={entry.id} entry={entry} isFirst={i === 0} />
        ))}
      </motion.div>

      {/* What's Next */}
      <motion.div
        variants={variants.fadeUp}
        className="rounded-[var(--radius-xl)] bg-gradient-to-br from-accent/8 via-indigo-500/5 to-violet-500/8 ring-1 ring-accent/15 px-8 py-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">Coming Soon</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">What&apos;s next</h3>
        <p className="text-sm text-muted-foreground mb-6">Here&apos;s a preview of what we&apos;re building for the next major release.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {UPCOMING.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition.page, delay: 0.2 + i * 0.07 }}
              className="rounded-[var(--radius-lg)] bg-[var(--surface)]/60 ring-1 ring-border px-4 py-4"
            >
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-accent-muted flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-foreground mb-1">{item.title}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
