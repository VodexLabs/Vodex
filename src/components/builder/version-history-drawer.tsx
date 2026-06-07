"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  X,
  Loader2,
  MessageSquareText,
  Layers,
  Globe,
  Eye,
  Rocket,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { VodexConfirmModal } from "@/components/ui/vodex-confirm-modal";

type TimelineEntry = {
  id: string;
  kind: "prompt" | "snapshot" | "published";
  created_at: string;
  title: string;
  subtitle?: string;
  prompt?: string;
  version_id?: string;
  version_number?: number;
  publish_version?: number;
  is_current_preview?: boolean;
  is_live_published?: boolean;
  changed_paths?: string[] | null;
};

type SwitchAction = "preview" | "publish";

export function VersionHistoryDrawer({
  projectId,
  open,
  onClose,
  onOpenPublish,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onOpenPublish?: () => void;
}) {
  const [entries, setEntries] = React.useState<TimelineEntry[]>([]);
  const [livePublishedVersion, setLivePublishedVersion] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{
    versionId: string;
    action: SwitchAction;
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, { credentials: "include" });
      const body = (await res.json()) as {
        timeline?: TimelineEntry[];
        live_published_version?: number | null;
      };
      setEntries(body.timeline ?? []);
      setLivePublishedVersion(
        typeof body.live_published_version === "number" ? body.live_published_version : null,
      );
    } catch {
      toast.error("Could not load version history.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function switchVersion(versionId: string, action: SwitchAction) {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId }),
      });
      if (!res.ok) {
        toast.error("Could not switch version.");
        return;
      }
      if (action === "preview") {
        toast.success("Preview updated — your workspace now shows this version.");
      } else {
        toast.success("Version loaded — open Publish when you are ready to go live.");
        onOpenPublish?.();
      }
      await load();
    } finally {
      setRestoring(null);
      setConfirm(null);
    }
  }

  function entryIcon(kind: TimelineEntry["kind"]) {
    if (kind === "prompt") return MessageSquareText;
    if (kind === "published") return Globe;
    return Layers;
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-foreground/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[var(--z-drawer)] flex w-full max-w-md flex-col bg-background shadow-2xl ring-1 ring-border"
            data-testid="version-history-drawer"
            role="dialog"
            aria-label="Version history"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-accent" />
                  <div>
                    <h2 className="text-[15px] font-semibold">Version history</h2>
                    <p className="text-[11px] text-muted-foreground">
                      Every prompt, preview snapshot, and published release
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              {livePublishedVersion != null ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/20">
                  <Globe className="size-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    Live published version: v{livePublishedVersion}
                  </span>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-surface/80 px-3 py-2 text-[11px] text-muted-foreground ring-1 ring-border/70">
                  Not published yet — preview builds stay in your workspace until you publish.
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading history…
                </div>
              ) : entries.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  No history yet. Send a build prompt to create your first snapshot.
                </p>
              ) : (
                <ul className="space-y-3">
                  {entries.map((entry) => {
                    const Icon = entryIcon(entry.kind);
                    const isSnapshot = entry.kind === "snapshot";
                    const isPrompt = entry.kind === "prompt";
                    return (
                      <li
                        key={entry.id}
                        className={cn(
                          "rounded-xl p-3.5 ring-1",
                          entry.is_current_preview
                            ? "bg-accent/5 ring-accent/30"
                            : entry.is_live_published
                              ? "bg-emerald-500/5 ring-emerald-500/25"
                              : "bg-surface/80 ring-border/70",
                        )}
                        data-testid={`version-timeline-${entry.kind}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                              entry.kind === "prompt"
                                ? "bg-violet-500/10 ring-violet-500/20 text-violet-600"
                                : entry.kind === "published"
                                  ? "bg-emerald-500/10 ring-emerald-500/20 text-emerald-600"
                                  : "bg-accent/10 ring-accent/20 text-accent",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold text-foreground">{entry.title}</p>
                              {entry.is_current_preview ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                  <Eye className="size-3" />
                                  Current preview
                                </span>
                              ) : null}
                              {entry.is_live_published ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <Globe className="size-3" />
                                  Live
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                            {entry.prompt ? (
                              <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-foreground/90">
                                “{entry.prompt}”
                              </p>
                            ) : null}
                            {entry.subtitle && !entry.prompt ? (
                              <p className="mt-2 text-[12px] text-muted-foreground">{entry.subtitle}</p>
                            ) : null}
                            {entry.changed_paths?.length ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {entry.changed_paths.length} file
                                {entry.changed_paths.length === 1 ? "" : "s"} changed
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {isSnapshot && entry.version_id && !entry.is_current_preview ? (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                            <button
                              type="button"
                              disabled={restoring === entry.version_id}
                              onClick={() =>
                                setConfirm({ versionId: entry.version_id!, action: "preview" })
                              }
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-accent/90"
                            >
                              {restoring === entry.version_id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Eye className="size-3" />
                              )}
                              Use for preview
                            </button>
                            <button
                              type="button"
                              disabled={restoring === entry.version_id}
                              onClick={() =>
                                setConfirm({ versionId: entry.version_id!, action: "publish" })
                              }
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground ring-1 ring-border hover:ring-accent/40"
                            >
                              <Rocket className="size-3" />
                              Prepare to publish
                            </button>
                          </div>
                        ) : null}

                        {isPrompt ? (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Sparkles className="size-3 text-accent/80" />
                            Saved before publish — switch preview snapshots above to revisit this build.
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>

          <VodexConfirmModal
            open={Boolean(confirm)}
            title={
              confirm?.action === "publish"
                ? "Load this version for publishing?"
                : "Switch preview to this version?"
            }
            description={
              confirm?.action === "publish"
                ? "Your workspace files will be replaced with this snapshot. Open Publish when you are ready to push it live — this does not auto-publish."
                : "Your preview workspace will load this snapshot. Credits are not refunded."
            }
            confirmLabel={confirm?.action === "publish" ? "Load for publish" : "Use for preview"}
            loading={Boolean(restoring)}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              if (confirm) void switchVersion(confirm.versionId, confirm.action);
            }}
          />
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Top builder toolbar button */
export function VersionHistoryEntryButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="version-history-entrypoint"
      title="Version history"
      aria-label="Version history"
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-transparent transition",
        "hover:bg-surface hover:text-foreground hover:ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        className,
      )}
    >
      <History className="size-3.5 text-accent" strokeWidth={1.75} />
      <span className="hidden sm:inline">Versions</span>
    </button>
  );
}
