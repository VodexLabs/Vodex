"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Paperclip, Sparkles, X, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";

type PromptComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  attachments?: File[];
  onAttachmentsChange?: (files: File[]) => void;
};

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  busy,
  attachments = [],
  onAttachmentsChange,
}: PromptComposerProps) {
  const ta = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 128), 340)}px`;
  }, [value]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    onAttachmentsChange?.([...attachments, ...files]);
    e.target.value = "";
  }

  function removeAttachment(i: number) {
    onAttachmentsChange?.(attachments.filter((_, j) => j !== i));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.page}
      className="relative mx-auto w-full max-w-3xl"
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.json,.zip,.md"
        className="hidden"
        onChange={handleFiles}
      />

      <div
        className={cn(
          "rounded-[var(--radius-xl)] p-[1px]",
          "bg-gradient-to-b from-white/90 via-white/40 to-white/10 shadow-[var(--shadow-md)] ring-1 ring-border/80",
          "dark:from-white/10 dark:via-white/[0.04] dark:to-transparent dark:ring-white/[0.08]",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[calc(var(--radius-xl)-1px)]",
            "glass-border bg-glass shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
            busy && "ring-2 ring-ring/40",
          )}
        >
          <AnimatePresence>
            {busy ? (
              <motion.div
                key="gen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit] bg-surface/25 backdrop-blur-[2px]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-accent/10 to-transparent motion-safe:animate-[ds-gen-scan_1.8s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.1s" }}
                />
                <div className="absolute bottom-4 left-5 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-accent/40 motion-safe:animate-ping" />
                    <span className="relative size-2 rounded-full bg-accent" />
                  </span>
                  Launching generation workspace…
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Attachment preview chips — inside the composer */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pt-4">
              {attachments.map((f, i) => {
                const Icon = fileIcon(f);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/8 px-2.5 py-1 text-[11px] font-medium text-accent"
                  >
                    <Icon className="size-3 shrink-0" strokeWidth={1.75} />
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="ml-0.5 cursor-pointer opacity-60 hover:opacity-100 transition"
                    >
                      <X className="size-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <label className="sr-only" htmlFor="dreamos-create-prompt">
            Describe what you want to create
          </label>
          <textarea
            id="dreamos-create-prompt"
            ref={ta}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            disabled={busy}
            placeholder="Describe the app you want to exist — flows, mood, motion, and who it's for. We'll orchestrate the rest."
            className={cn(
              "relative z-[1] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[16px] leading-relaxed tracking-[-0.022em] text-foreground outline-none",
              "placeholder:text-muted-foreground/50",
              "min-h-[128px]",
              "disabled:opacity-55",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />

          <div className="relative z-[1] flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              {/* Paperclip — functional file picker */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-muted-foreground ring-1 ring-transparent transition hover:bg-muted/60 hover:text-foreground hover:ring-border/70 active:scale-95"
                aria-label="Attach files"
                title="Attach images, PDFs, or files"
              >
                <Paperclip className="size-[17px]" strokeWidth={1.55} />
              </button>

              {/* Auto mode indicator */}
              <span className="hidden items-center gap-1.5 rounded-full bg-muted/55 px-3 py-1 text-[12px] font-medium text-muted-foreground ring-1 ring-border/60 sm:inline-flex">
                <Sparkles className="size-3.5 text-accent" strokeWidth={1.55} />
                Auto
              </span>

              {attachments.length > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                  {attachments.length} attached
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground/50 sm:inline select-none">
                Ctrl+Enter
              </span>
              <Button
                type="button"
                variant="accent"
                size="lg"
                className="gap-2 rounded-[var(--radius-md)] px-4"
                disabled={busy || !value.trim()}
                onClick={onSubmit}
              >
                {busy ? "Launching…" : "Create"}
                <ArrowUp className="size-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
