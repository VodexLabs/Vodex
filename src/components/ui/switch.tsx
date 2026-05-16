"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Switch({
  checked: controlled,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  const [uncontrolled, setUncontrolled] = React.useState(!!defaultChecked);
  const isControlled = controlled !== undefined;
  const on = isControlled ? !!controlled : uncontrolled;

  const toggle = () => {
    if (disabled) return;
    const next = !on;
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full ring-1 transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.96]",
        on
          ? "bg-foreground ring-border-strong"
          : "bg-muted ring-border hover:bg-muted/80",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      <motion.span
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className="pointer-events-none absolute left-0.5 top-0.5 size-6 rounded-full bg-surface shadow-[var(--shadow-xs)] ring-1 ring-border"
        animate={{ x: on ? 16 : 0 }}
      />
    </button>
  );
}
