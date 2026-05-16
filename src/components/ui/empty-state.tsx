"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void };
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
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
      {action ? (
        <Button
          variant="accent"
          size="lg"
          className="mt-8"
          type="button"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </motion.div>
  );
}
