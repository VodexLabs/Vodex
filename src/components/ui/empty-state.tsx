"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateAction = { label: string; onClick?: () => void; href?: string };

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  hints?: string[];
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  hints,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-xl)] bg-surface px-8 py-14 text-center shadow-[var(--shadow-card)] ring-1 ring-border",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
        {icon}
      </div>
      <h3 className="mt-6 text-[17px] font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {hints && hints.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-left max-w-xs">
          {hints.map((hint) => (
            <li key={hint} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent/60" />
              {hint}
            </li>
          ))}
        </ul>
      )}
      {(action || secondaryAction) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action && (
            action.href ? (
              <a href={action.href} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-accent/90">
                {action.label}
              </a>
            ) : (
              <Button variant="accent" size="lg" type="button" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/70">
                {secondaryAction.label}
              </a>
            ) : (
              <Button variant="secondary" size="lg" type="button" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </motion.div>
  );
}
