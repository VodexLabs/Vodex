import * as React from "react";
import { cn } from "@/lib/utils";

export const composerTextareaClass =
  "w-full resize-none appearance-none bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none border-0 shadow-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:opacity-50";

/** Outer shell for chat/build composers — no blue inset rings on inner fields. */
export function ComposerShell({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "composer-shell rounded-xl border border-border/70 bg-surface shadow-sm transition-[border-color,box-shadow]",
        "focus-within:border-border focus-within:shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

