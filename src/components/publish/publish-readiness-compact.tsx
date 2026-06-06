"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronRight,
  X,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishReadinessCard } from "@/components/publish/publish-readiness-cards";

export type ReadinessRowStatus = "verified" | "warning" | "risk" | "blocker" | "not_required" | "loading";

export type ReadinessDetailRow = {
  id: string;
  label: string;
  status: ReadinessRowStatus;
  reason?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function mapCardStatus(card: PublishReadinessCard): ReadinessRowStatus {
  if (card.status === "loading") return "loading";
  if (card.status === "pass") return "verified";
  if (card.status === "warn") return "warning";
  return "blocker";
}

function summaryFromCards(cards: PublishReadinessCard[]): {
  label: "Ready" | "Needs attention" | "Blocked";
  tone: "ready" | "warn" | "blocked";
  blockerCount: number;
} {
  const rows = cards.filter((c) => c.status !== "loading");
  const blockers = rows.filter((c) => c.status === "fail").length;
  const warnings = rows.filter((c) => c.status === "warn").length;
  if (blockers > 0) return { label: "Blocked", tone: "blocked", blockerCount: blockers };
  if (warnings > 0) return { label: "Needs attention", tone: "warn", blockerCount: 0 };
  return { label: "Ready", tone: "ready", blockerCount: 0 };
}

function StatusPill({ status }: { status: ReadinessRowStatus }) {
  const map = {
    verified: { icon: CheckCircle2, text: "Verified", className: "text-emerald-600" },
    warning: { icon: AlertTriangle, text: "Warning", className: "text-amber-600" },
    risk: { icon: AlertTriangle, text: "Risk", className: "text-orange-600" },
    blocker: { icon: XCircle, text: "Blocker", className: "text-destructive" },
    not_required: { icon: MinusCircle, text: "Not required", className: "text-muted-foreground" },
    loading: { icon: Loader2, text: "Checking", className: "text-muted-foreground animate-spin" },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", m.className)}>
      <Icon className="size-3.5" strokeWidth={1.75} />
      {m.text}
    </span>
  );
}

export function PublishReadinessCompact({
  cards,
  extraRows = [],
  className,
}: {
  cards: PublishReadinessCard[];
  extraRows?: ReadinessDetailRow[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const summary = summaryFromCards(cards);
  const loading = cards.some((c) => c.status === "loading");

  const detailRows: ReadinessDetailRow[] = [
    ...cards.map((c) => ({
      id: c.id,
      label: c.label,
      status: mapCardStatus(c),
      reason: c.detail,
    })),
    ...extraRows,
  ];

  return (
    <>
      <button
        type="button"
        data-testid="publish-readiness-compact"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 transition hover:shadow-sm",
          summary.tone === "ready" && "bg-emerald-500/8 ring-emerald-500/25",
          summary.tone === "warn" && "bg-amber-500/8 ring-amber-500/25",
          summary.tone === "blocked" && "bg-destructive/8 ring-destructive/25",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Production readiness
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {loading ? "Checking…" : summary.label}
            {!loading && summary.blockerCount > 0 ? (
              <span className="ml-1.5 text-[12px] font-medium text-destructive">
                · {summary.blockerCount} blocker{summary.blockerCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div
                  className="fixed inset-0 z-[10060] flex items-end justify-center sm:items-center"
                  role="dialog"
                  aria-modal="true"
                >
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    className="relative flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl ring-1 ring-border sm:rounded-2xl"
                    data-testid="publish-readiness-drawer"
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <p className="text-[15px] font-semibold">Publish readiness details</p>
                      <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                      <ul className="space-y-2">
                        {detailRows.map((row) => (
                          <li
                            key={row.id}
                            className="flex flex-col gap-1 rounded-xl bg-surface/80 px-3 py-2.5 ring-1 ring-border/60"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[12px] font-semibold text-foreground">{row.label}</p>
                              <StatusPill status={row.status} />
                            </div>
                            {row.reason ? (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">{row.reason}</p>
                            ) : null}
                            {row.actionLabel && row.onAction ? (
                              <button
                                type="button"
                                onClick={row.onAction}
                                className="mt-1 w-fit text-[11px] font-semibold text-accent hover:underline"
                              >
                                {row.actionLabel}
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
