"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const selectCls =
  "h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 pr-8 text-[13px] text-foreground outline-none ring-1 ring-border shadow-[var(--shadow-xs)] transition duration-200 ease-out hover:bg-surface-raised focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background appearance-none cursor-pointer";

export const textareaCls =
  "w-full rounded-[var(--radius-md)] bg-surface px-3 py-2.5 text-[13px] text-foreground outline-none ring-1 ring-border shadow-[var(--shadow-xs)] resize-none transition duration-200 ease-out hover:bg-surface-raised focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background placeholder:text-muted-foreground/70";

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  children,
  danger = false,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] backdrop-blur-xl ring-1 shadow-[var(--shadow-card)] overflow-hidden",
        danger
          ? "ring-red-200/70 dark:ring-red-800/50 bg-red-50/40 dark:bg-red-950/20"
          : "bg-glass ring-border",
        className,
      )}
    >
      <div
        className={cn(
          "px-6 py-5 border-b",
          danger
            ? "border-red-200/60 dark:border-red-800/40"
            : "border-border",
        )}
      >
        <h2
          className={cn(
            "text-[13px] font-semibold tracking-[-0.02em]",
            danger ? "text-red-700 dark:text-red-400" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className={noPadding ? "" : "px-6 py-5"}>{children}</div>
    </div>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  border?: boolean;
}

export function SettingRow({
  title,
  description,
  children,
  border = true,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-4",
        border && "border-b border-border last:border-0",
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block text-[13px] font-medium text-foreground mb-1.5",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-border">
      {children}
    </div>
  );
}

export function UsageBar({
  label,
  used,
  total,
  unit = "",
  color = "bg-accent",
}: {
  label: string;
  used: number;
  total: number;
  unit?: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()}
          {unit} / {total.toLocaleString()}
          {unit}
          <span className="ml-1.5 text-[11px] font-medium text-muted-foreground/70">
            ({pct}%)
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
