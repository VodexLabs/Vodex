"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyIdButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      title="Copy Account ID"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 transition",
        copied
          ? "bg-positive/10 text-positive ring-positive/25"
          : "text-muted-foreground ring-border hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
