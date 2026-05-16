import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "accent" | "positive" | "warning";

const badgeVariant: Record<BadgeVariant, string> = {
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-border",
  accent: "bg-accent-muted text-foreground ring-1 ring-border",
  positive: "bg-positive-muted text-positive ring-1 ring-border",
  warning: "bg-warning-muted text-warning ring-1 ring-border",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        badgeVariant[variant],
        className,
      )}
      {...props}
    />
  );
}
