"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";
import { PHASE_MARKER } from "@/lib/creation/orchestration";

function extractPhases(text: string): string[] {
  const phases: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(PHASE_MARKER);
    if (m?.[2]?.trim()) phases.push(m[2].trim());
  }
  return phases;
}

function extractRecentFiles(text: string): string[] {
  const paths = new Set<string>();
  const fenceRe = /```[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text))) {
    const header = m[0].split("\n")[0] ?? "";
    const fileMatch = header.match(/file[=:]\s*([^\s`]+)/i);
    if (fileMatch?.[1]) paths.add(fileMatch[1].replace(/^["']|["']$/g, ""));
  }
  const pathRe = /(?:^|\s)([\w@./-]+\.(?:tsx?|jsx?|css|json|md))\b/gim;
  while ((m = pathRe.exec(text))) {
    const p = m[1];
    if (p.includes("/") || p.startsWith("src.")) paths.add(p);
  }
  return [...paths].slice(-4);
}

interface Props {
  isStreaming: boolean;
  className?: string;
  streamingText?: string;
  qualityRepairing?: boolean;
}

/**
 * Live build steps derived from streamed assistant output (phase headers + file paths).
 * No fake timer progression — only moves when the model emits new content.
 */
export function BuildStatusNarrator({
  isStreaming,
  className,
  streamingText = "",
  qualityRepairing = false,
}: Props) {
  const [visible, setVisible] = React.useState(false);

  const phases = React.useMemo(() => extractPhases(streamingText), [streamingText]);
  const files = React.useMemo(() => extractRecentFiles(streamingText), [streamingText]);

  const steps = React.useMemo(() => {
    const list: Array<{ id: string; label: string; detail?: string; status: "done" | "active" | "pending" }> = [];
    if (phases.length === 0 && isStreaming) {
      list.push({
        id: "analyze",
        label: "Understanding your request",
        detail: "Reading your prompt",
        status: "active",
      });
    } else {
      phases.forEach((label, i) => {
        const isLast = i === phases.length - 1;
        list.push({
          id: `${label}-${i}`,
          label,
          status: isLast && isStreaming ? "active" : "done",
        });
      });
    }
    if (files.length > 0) {
      const lastFile = files[files.length - 1]!;
      list.push({
        id: `file-${lastFile}`,
        label: isStreaming ? `Writing ${lastFile}` : `Wrote ${lastFile}`,
        status: isStreaming ? "active" : "done",
      });
    }
    return list;
  }, [phases, files, isStreaming]);

  React.useEffect(() => {
    if (isStreaming) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  if (steps.length === 0 && !qualityRepairing) return null;

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
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1 transition",
                step.status === "active" &&
                  "bg-accent/[0.1] ring-accent/35 shadow-[0_0_16px_-6px_hsl(var(--accent)/0.45)]",
                step.status === "done" && "bg-surface/80 ring-border/70",
                step.status === "pending" && "opacity-50 ring-border/40",
              )}
            >
              {step.status === "done" ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-accent" strokeWidth={1.75} />
              ) : step.status === "active" && step.id.startsWith("file-") ? (
                <FileCode2 className="size-3.5 shrink-0 animate-pulse text-accent" strokeWidth={1.75} />
              ) : step.status === "active" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" strokeWidth={2} />
              ) : (
                <VodexBrandIcon variant="assistant" className="shrink-0 opacity-90" alt="" />
              )}
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-foreground">{step.label}</p>
                {step.detail && step.status === "active" && (
                  <p className="text-[10.5px] text-muted-foreground">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
