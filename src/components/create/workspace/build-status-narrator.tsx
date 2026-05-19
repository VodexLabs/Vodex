"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const USER_FRIENDLY_STATUSES = [
  "Planning your app",
  "Designing interface",
  "Creating screens",
  "Connecting logic",
  "Preparing preview",
  "Finalizing build",
];

interface Props {
  isStreaming: boolean;
  className?: string;
}

/**
 * Rotating status lines during generation — no technical jargon.
 */
export function BuildStatusNarrator({ isStreaming, className }: Props) {
  const [tick, setTick] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isStreaming) {
      setVisible(true);
      const id = setInterval(() => setTick((t) => t + 1), 2400);
      return () => clearInterval(id);
    }
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [isStreaming]);

  const line = USER_FRIENDLY_STATUSES[tick % USER_FRIENDLY_STATUSES.length];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn("flex items-center gap-2 px-3 py-1.5", className)}
        >
          <Loader2 className="size-3 shrink-0 animate-spin text-accent/70" strokeWidth={2} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={line}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-[11.5px] text-muted-foreground"
            >
              {line}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
