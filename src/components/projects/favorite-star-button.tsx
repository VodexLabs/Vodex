"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteStarButton({
  active,
  onToggle,
  className,
  size = "md",
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <motion.button
      type="button"
      data-no-navigate
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      whileTap={{ scale: 0.88 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "pointer-events-auto relative z-20 flex shrink-0 items-center justify-center rounded-lg p-1.5 transition",
        active
          ? "bg-amber-400/10 ring-1 ring-amber-400/35"
          : "hover:bg-amber-400/8 hover:ring-1 hover:ring-amber-400/20",
        className,
      )}
    >
      {active && (
        <>
          <span
            className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.45),transparent_70%)]"
            aria-hidden
          />
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-lg bg-amber-400/25"
            animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        </>
      )}
      <Star
        className={cn(
          iconSize,
          "relative transition-all duration-300",
          active
            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]"
            : "text-muted-foreground/55 group-hover:text-amber-300/90",
        )}
        strokeWidth={active ? 2 : 1.75}
      />
    </motion.button>
  );
}
