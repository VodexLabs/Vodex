import type { BuildTerminalPhase } from "@/lib/build/build-terminal-state-machine";

/** User-facing build step kinds — each maps to a distinct outline color in chat UI. */
export type BuildStepUiKind =
  | "planning"
  | "generating"
  | "parsing"
  | "wiring"
  | "paused"
  | "done";

export const BUILD_STEP_LABEL: Record<BuildStepUiKind, string> = {
  planning: "Planning",
  generating: "Generating files",
  parsing: "Parsing & validating",
  wiring: "Wiring navigation",
  paused: "Build paused",
  done: "Build complete",
};

export const BUILD_STEP_RING_CLASS: Record<BuildStepUiKind, string> = {
  planning: "ring-2 ring-violet-400/55 bg-violet-50/40 dark:bg-violet-950/20",
  generating: "ring-2 ring-sky-400/65 bg-sky-50/50 dark:bg-sky-950/25",
  parsing: "ring-2 ring-amber-400/55 bg-amber-50/40 dark:bg-amber-950/20",
  wiring: "ring-2 ring-emerald-400/55 bg-emerald-50/40 dark:bg-emerald-950/20",
  paused: "ring-2 ring-rose-400/60 bg-rose-50/45 dark:bg-rose-950/25",
  done: "ring-2 ring-emerald-500/55 bg-emerald-50/50 dark:bg-emerald-950/25",
};

export const BUILD_STEP_ACCENT_CLASS: Record<BuildStepUiKind, string> = {
  planning: "text-violet-700 dark:text-violet-300",
  generating: "text-sky-700 dark:text-sky-300",
  parsing: "text-amber-700 dark:text-amber-300",
  wiring: "text-emerald-700 dark:text-emerald-300",
  paused: "text-rose-700 dark:text-rose-300",
  done: "text-emerald-700 dark:text-emerald-300",
};

export function resolveBuildStepUiKind(input: {
  phase: BuildTerminalPhase;
  working: boolean;
  paused?: boolean;
  hasFiles?: boolean;
}): BuildStepUiKind {
  if (!input.working) return "done";
  if (input.paused) return "paused";
  switch (input.phase) {
    case "planning":
    case "pending":
      return "planning";
    case "extracting_files":
    case "validating_quality":
      return "parsing";
    case "continuation_running":
      return input.hasFiles ? "wiring" : "generating";
    case "repairing":
      return "wiring";
    case "blocked_recoverable":
    case "blocked_final":
      return "paused";
    case "preview_ready":
    case "failed_final":
      return input.working ? "generating" : "done";
    case "saving":
    case "preview_preparing":
      return "wiring";
    case "model_generating":
    default:
      return "generating";
  }
}

export const NO_FILES_YET_THRESHOLD_MS = 30_000;
