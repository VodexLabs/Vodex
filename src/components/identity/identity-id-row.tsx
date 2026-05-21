"use client";

import * as React from "react";
import { Copy, Check, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { truncateIdentityId } from "@/lib/identity/dreamos-identity";

type IdentityIdRowProps = {
  label: string;
  value: string;
  className?: string;
};

export function IdentityIdRow({ label, value, className }: IdentityIdRowProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-md)] bg-muted/30 px-3 py-2.5 ring-1 ring-border/60 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Fingerprint className="size-3.5 shrink-0 text-accent/80" strokeWidth={1.75} />
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[70%]">
        <code
          className="min-w-0 truncate font-mono text-[12px] text-foreground"
          title={value}
        >
          {truncateIdentityId(value)}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!value}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ring-1 transition",
            copied
              ? "bg-positive/10 text-positive ring-positive/25"
              : "bg-background text-muted-foreground ring-border hover:text-foreground",
          )}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
