import type { BuildTerminalPhase } from "@/lib/build/build-terminal-state-machine";
import { isMajorBuildStage } from "@/lib/build/build-terminal-state-machine";

/** Rotating status lines during silent model-generation gaps. */
export function modelStageActivityMessages(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const systems: string[] = [];
  if (/smart home|automation|device|iot|scene/i.test(p)) {
    systems.push("smart home device model", "automation scenes", "device dashboard");
  }
  if (/workout|fitness|gym|streak|pr\b|personal record/i.test(p)) {
    systems.push("workout streak engine", "PR tracker", "progress gallery", "achievement badges");
  }
  if (/dashboard|analytics|insight/i.test(p)) systems.push("analytics dashboard", "KPI cards");
  if (/auth|login|signup|user/i.test(p)) systems.push("auth flows", "profile settings");
  if (/payment|stripe|checkout|subscription/i.test(p)) systems.push("billing", "checkout");
  if (systems.length === 0) {
    systems.push("core screens", "navigation", "data model", "settings");
  }

  const intro = `I'll turn this into a production app with these systems: ${systems.slice(0, 6).join(", ")}. I'll map the data first, then generate the main screens and wire navigation.`;

  return [
    intro,
    "Designing route map",
    "Planning data model and entity relationships",
    "Preparing automation and detail-page UI",
    "Requesting dashboard and detail pages",
    "Waiting for model response",
    "Parsing generated files",
    "Checking route coverage",
    "Continuing missing pages",
  ];
}

export function pickLiveActivityLine(messages: string[], elapsedMs: number): string {
  if (messages.length === 0) return "Working on your app…";
  const idx = Math.min(messages.length - 1, Math.floor(elapsedMs / 2200));
  return messages[idx]!;
}

export function continuationStatusLine(attempt: number, maxAttempts: number, reason?: string): string {
  const n = Math.min(attempt, maxAttempts);
  const base = `Retry ${n}/${maxAttempts} · requesting richer dashboard and route pages…`;
  if (reason?.includes("quality")) return `Retry ${n}/${maxAttempts} · targeted rewrite for weak pages…`;
  if (reason?.includes("compact")) return `Retry ${n}/${maxAttempts} · compact route set, then full continuation…`;
  return base;
}

export function formatWatchdogHeartbeat(input: {
  modelLabel?: string | null;
  elapsedSec: number;
  attempt?: number;
  maxAttempts?: number;
  waitingOn?: string;
  tick?: number;
}): string {
  const model = input.modelLabel?.trim() || "the model";
  const wait = input.waitingOn?.trim() || "model response";
  if (input.attempt != null && input.maxAttempts != null) {
    return `Still waiting for ${model} — ${wait}… ${input.elapsedSec}s · attempt ${input.attempt}/${input.maxAttempts}`;
  }
  return `Still waiting for ${model} — ${wait}… ${input.elapsedSec}s`;
}

export function formatCompactQualityLine(score: number, target: number, files: number): string {
  return `Validating ${files} files · quality ${score}/${target}…`;
}

export type BuildActivityPresentation = {
  mode: "card" | "compact";
  line: string;
  phase: BuildTerminalPhase;
};

export function deriveBuildActivityPresentation(input: {
  phase: BuildTerminalPhase;
  elapsedMs: number;
  userPrompt?: string;
  assistantMessage?: string;
  isHeartbeat?: boolean;
  attempt?: number;
  maxAttempts?: number;
  qualityScore?: number;
  qualityTarget?: number;
  fileCount?: number;
  modelLabel?: string | null;
}): BuildActivityPresentation {
  const messages = modelStageActivityMessages(input.userPrompt ?? "");
  const elapsedSec = Math.max(0, Math.floor(input.elapsedMs / 1000));

  if (input.isHeartbeat) {
    return {
      mode: "compact",
      phase: input.phase,
      line: formatWatchdogHeartbeat({
        modelLabel: input.modelLabel,
        elapsedSec,
        attempt: input.attempt,
        maxAttempts: input.maxAttempts,
        waitingOn: input.assistantMessage ?? "model response",
      }),
    };
  }

  if (
    input.phase === "continuation_running" &&
    input.attempt != null &&
    input.maxAttempts != null
  ) {
    return {
      mode: input.attempt <= 1 && !input.isHeartbeat ? "card" : "compact",
      phase: input.phase,
      line: continuationStatusLine(input.attempt, input.maxAttempts, input.assistantMessage ?? undefined),
    };
  }

  if (
    input.qualityScore != null &&
    input.qualityTarget != null &&
    input.phase === "validating_quality"
  ) {
    return {
      mode: "compact",
      phase: input.phase,
      line: formatCompactQualityLine(
        input.qualityScore,
        input.qualityTarget,
        input.fileCount ?? 0,
      ),
    };
  }

  const msg = input.assistantMessage ?? "";
  if (/first pass.*thin|compact route|continuing generation|targeted rewrite/i.test(msg)) {
    return {
      mode: "compact",
      phase: "continuation_running",
      line: continuationStatusLine(
        input.attempt ?? 2,
        input.maxAttempts ?? 6,
        msg,
      ),
    };
  }

  if (isMajorBuildStage(input.phase) && elapsedSec < 8) {
    return {
      mode: "card",
      phase: input.phase,
      line: pickLiveActivityLine(messages, input.elapsedMs),
    };
  }

  return {
    mode: "compact",
    phase: input.phase,
    line: pickLiveActivityLine(messages, input.elapsedMs),
  };
}
