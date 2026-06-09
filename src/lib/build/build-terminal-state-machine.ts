import type { BuildJobEventRow } from "@/lib/build/build-job-events";

/** Every build job must end in one terminal phase. */
export const BUILD_TERMINAL_PHASES = [
  "pending",
  "planning",
  "model_generating",
  "extracting_files",
  "continuation_running",
  "validating_quality",
  "repairing",
  "saving",
  "preview_preparing",
  "preview_ready",
  "blocked_recoverable",
  "blocked_final",
  "failed_final",
] as const;

export type BuildTerminalPhase = (typeof BUILD_TERMINAL_PHASES)[number];

export const TERMINAL_BUILD_PHASES: readonly BuildTerminalPhase[] = [
  "preview_ready",
  "blocked_recoverable",
  "blocked_final",
  "failed_final",
] as const;

export function isTerminalBuildPhase(phase: BuildTerminalPhase): boolean {
  return (TERMINAL_BUILD_PHASES as readonly string[]).includes(phase);
}

export function phaseFromWorkflowMeta(meta?: Record<string, unknown>): BuildTerminalPhase | null {
  const raw = meta?.build_terminal_phase;
  if (typeof raw === "string" && (BUILD_TERMINAL_PHASES as readonly string[]).includes(raw)) {
    return raw as BuildTerminalPhase;
  }
  return null;
}

export function mapJobTypeToBuildPhase(
  type: BuildJobEventRow["type"],
  meta?: Record<string, unknown>,
): BuildTerminalPhase {
  const explicit = phaseFromWorkflowMeta(meta);
  if (explicit) return explicit;
  switch (type) {
    case "planning_app":
    case "understanding_request":
      return meta?.heartbeat ? "model_generating" : "planning";
    case "writing_file":
    case "editing_file":
      return meta?.extraction_stream ? "extracting_files" : "model_generating";
    case "checking_file":
    case "validating_preview":
      return "validating_quality";
    case "fixing_error":
      return "repairing";
    case "saving_files":
      return "saving";
    case "preparing_preview":
      return "preview_preparing";
    case "completed":
      return "preview_ready";
    case "partial_credit_stop":
      return "blocked_recoverable";
    case "failed":
      return "failed_final";
    default:
      return "pending";
  }
}

export function deriveBuildPhaseFromEvents(events: BuildJobEventRow[]): BuildTerminalPhase {
  if (!events.length) return "pending";
  const last = events[events.length - 1]!;
  const terminal = phaseFromWorkflowMeta(last.metadata);
  if (terminal && isTerminalBuildPhase(terminal)) return terminal;
  return mapJobTypeToBuildPhase(last.type, last.metadata);
}

/** Major stages warrant the full blue activity card. */
export function isMajorBuildStage(phase: BuildTerminalPhase): boolean {
  return (
    phase === "planning" ||
    phase === "model_generating" ||
    phase === "extracting_files" ||
    phase === "continuation_running" ||
    phase === "validating_quality" ||
    phase === "repairing"
  );
}

export const MAX_SAFE_CONTINUATION_ATTEMPTS = 6;
