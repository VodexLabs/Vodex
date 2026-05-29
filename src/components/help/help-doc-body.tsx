"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function HelpDocBody({ html, className }: { html: string; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    root.querySelectorAll("pre[data-copyable]").forEach((pre) => {
      if (pre.querySelector("[data-copy-btn]")) return;
      const code = pre.querySelector("code");
      const text = code?.textContent ?? pre.textContent ?? "";
      const wrap = document.createElement("div");
      wrap.className = "relative group";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-copy-btn", "true");
      btn.className =
        "absolute right-2 top-2 rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 ring-1 ring-border transition group-hover:opacity-100 focus:opacity-100";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
          window.setTimeout(() => {
            btn.textContent = "Copy";
          }, 1600);
        } catch {
          btn.textContent = "Failed";
        }
      });
      wrap.appendChild(btn);
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className={cn("help-doc-prose mt-8 [&>*:first-child]:mt-0", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Inline copy chip for callback URL examples in custom components */
export function CopyUrlChip({ label, value }: { label?: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="my-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border">
      {label ? <span className="text-xs font-medium text-foreground">{label}</span> : null}
      <code className="flex-1 break-all text-xs text-muted-foreground">{value}</code>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-foreground ring-1 ring-border hover:bg-background"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
