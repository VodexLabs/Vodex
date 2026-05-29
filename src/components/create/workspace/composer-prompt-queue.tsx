"use client";

import * as React from "react";
import { Pencil, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComposerQueueItem = {
  id: string;
  text: string;
  status: "queued" | "paused";
};

export function ComposerPromptQueue({
  items,
  onCancel,
  onPause,
  onResume,
  onEdit,
  className,
}: {
  items: ComposerQueueItem[];
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onEdit: (id: string, next: string) => void;
  className?: string;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-[14px] border border-border/55 bg-muted/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      data-testid="composer-prompt-queue"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/45 px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
          Queue
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          {items.filter((i) => i.status === "queued").length} waiting
        </span>
      </div>
      <ul className="divide-y divide-border/40">
        {items.map((item, index) => {
          const paused = item.status === "paused";
          const editing = editingId === item.id;
          return (
            <li
              key={item.id}
              data-testid={`composer-queue-item-${index + 1}`}
              data-queue-position={index + 1}
              data-queue-status={paused ? "paused" : "queued"}
              className={cn(
                "group flex min-h-[40px] items-start gap-2 px-2.5 py-2 transition-colors",
                index === 0 && "bg-background/40",
                paused && "opacity-75",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  paused ? "bg-muted-foreground/40" : "bg-accent/80",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                {editing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border-0 bg-background/80 px-2 py-1.5 text-[12px] leading-snug text-foreground ring-1 ring-border/60 focus:outline-none focus:ring-accent/35"
                    autoFocus
                  />
                ) : (
                  <p className="line-clamp-2 text-[12px] leading-snug text-foreground/90">{item.text}</p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground/65">
                  #{index + 1} · {paused ? "Paused" : "Queued"}
                </p>
                {editing ? (
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.trim();
                        if (next) onEdit(item.id, next);
                        setEditingId(null);
                      }}
                      className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
              {!editing ? (
                <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                  <QueueIconBtn
                    label="Edit"
                    onClick={() => {
                      setEditingId(item.id);
                      setDraft(item.text);
                    }}
                  >
                    <Pencil className="size-3" strokeWidth={1.75} />
                  </QueueIconBtn>
                  {paused ? (
                    <QueueIconBtn label="Resume" onClick={() => onResume(item.id)}>
                      <Play className="size-3" strokeWidth={1.75} />
                    </QueueIconBtn>
                  ) : (
                    <QueueIconBtn label="Pause" onClick={() => onPause(item.id)}>
                      <Pause className="size-3" strokeWidth={1.75} />
                    </QueueIconBtn>
                  )}
                  <QueueIconBtn label="Remove" onClick={() => onCancel(item.id)}>
                    <X className="size-3" strokeWidth={1.75} />
                  </QueueIconBtn>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QueueIconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground/80 transition hover:bg-background/60 hover:text-foreground"
    >
      {children}
    </button>
  );
}
