"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { DreamOSMessageShell } from "@/components/create/workspace/dreamos-message-shell";

const BUILD_PHASES = [
  "Preparing your build",
  "Analyzing your request…",
  "Designing the app structure…",
  "Writing the first version…",
  "Checking preview readiness…",
];

type OptimisticAssistantRowProps = {
  mode: "build" | "discuss" | "edit" | "design";
};

export function OptimisticAssistantRow({ mode }: OptimisticAssistantRowProps) {
  const [dotFrame, setDotFrame] = React.useState(0);
  const [phaseIndex, setPhaseIndex] = React.useState(0);

  React.useEffect(() => {
    const dots = setInterval(() => setDotFrame((f) => (f + 1) % 3), 450);
    return () => clearInterval(dots);
  }, []);

  React.useEffect(() => {
    if (mode !== "build") return;
    const phases = setInterval(() => {
      setPhaseIndex((i) => Math.min(i + 1, BUILD_PHASES.length - 1));
    }, 2400);
    return () => clearInterval(phases);
  }, [mode]);

  const base = mode === "discuss" ? "Thinking" : (BUILD_PHASES[phaseIndex] ?? BUILD_PHASES[0]);
  const dots = ".".repeat(dotFrame + 1);
  const text = `${base.replace(/\.+$/u, "")}${dots}`;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="group">
      <DreamOSMessageShell mode={mode === "discuss" ? "discuss" : "build"} status="thinking" costState="pending">
        <p className="text-[13px] leading-relaxed text-foreground">{text}</p>
      </DreamOSMessageShell>
    </motion.div>
  );
}
