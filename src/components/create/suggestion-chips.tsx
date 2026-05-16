"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";

const suggestions = [
  "A calm invoicing assistant for freelancers",
  "A landing page for a boutique hotel",
  "A habit tracker with gentle reminders",
  "A recipe app with voice input",
  "A portfolio with cinematic product stories",
  "An internal wiki with intelligent search",
];

type SuggestionChipsProps = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function SuggestionChips({ onPick, disabled }: SuggestionChipsProps) {
  return (
    <div className="mt-9 flex flex-wrap justify-center gap-2.5 sm:gap-3">
      {suggestions.map((label, i) => (
        <motion.button
          key={label}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...transition.page,
            delay: 0.1 + i * 0.04,
          }}
          disabled={disabled}
          onClick={() => onPick(label)}
          className={cn(
            "max-w-[min(100%,20rem)] rounded-full bg-glass px-4 py-2.5 text-left text-[13px] font-medium tracking-[-0.01em] text-foreground/90",
            "glass-border shadow-[var(--shadow-xs)] ring-1 ring-white/50 backdrop-blur-md",
            "dark:ring-white/[0.06]",
            "transition duration-200 ease-out will-change-transform",
            "hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            disabled && "pointer-events-none opacity-45",
          )}
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}
