/**
 * Policy for huge prompt intake — max compressed plan size and detection thresholds.
 * Internal only; never expose routing or compression details to end users.
 */

/** ~4 chars per token heuristic for English prose. */
export const CHARS_PER_TOKEN_ESTIMATE = 4;

/** Prompts above this token estimate trigger intake compression before heavy models. */
export const HUGE_PROMPT_TOKEN_THRESHOLD = 4000;

/** Hard cap on execution brief tokens sent to any heavy implementation model. */
export const MAX_HEAVY_EXECUTION_BRIEF_TOKENS = 3000;

/** Alias — same as MAX_HEAVY_EXECUTION_BRIEF_TOKENS. */
export const MAX_COMPRESSED_PLAN_TOKENS = MAX_HEAVY_EXECUTION_BRIEF_TOKENS;

/** Hard character cap for compressed plan text (3k tokens × 4). */
export const MAX_COMPRESSED_PLAN_CHARS =
  MAX_HEAVY_EXECUTION_BRIEF_TOKENS * CHARS_PER_TOKEN_ESTIMATE;

/** Target total heavy-model input for first-pass build (all stages combined). */
export const HEAVY_MODEL_INPUT_TOKEN_BUDGET = 5000;

/** Absolute emergency cap for first-pass heavy input across all stages. */
export const HEAVY_MODEL_INPUT_ABSOLUTE_CAP = 6000;

/** Max tokens for per-stage instruction add-ons (not the shared brief). */
export const STAGE_INSTRUCTION_MAX_TOKENS = 500;

/** Single cheap-model intake chunk size (~6k tokens). */
export const CHUNK_INTAKE_MAX_CHARS = 24_000;

/** Overlap between intake chunks for continuity. */
export const CHUNK_INTAKE_OVERLAP_CHARS = 400;

/** Prompts above this char count use chunked cheap intake. */
export const CHUNKED_INTAKE_CHAR_THRESHOLD = 80_000;

/** Original prompt stored in memory; only a short excerpt is kept in backlog rows. */
export const ORIGINAL_PROMPT_MEMORY_KEY = "original_prompt";
export const ORIGINAL_PROMPT_FULL_MEMORY_KEY = "original_prompt_full";
export const BUILD_CONTEXT_MEMORY_KEY = "build_intake_summary";

export type PromptSizeClass = "small" | "medium" | "huge";

export class ExecutionBriefTooLargeError extends Error {
  readonly tokenEstimate: number;
  constructor(tokenEstimate: number) {
    super(`Execution brief exceeds ${MAX_HEAVY_EXECUTION_BRIEF_TOKENS} token cap (${tokenEstimate} estimated)`);
    this.name = "ExecutionBriefTooLargeError";
    this.tokenEstimate = tokenEstimate;
  }
}

export class HeavyInputBudgetExceededError extends Error {
  readonly tokenEstimate: number;
  constructor(tokenEstimate: number, cap: number) {
    super(`Heavy input budget exceeded (${tokenEstimate} > ${cap} tokens)`);
    this.name = "HeavyInputBudgetExceededError";
    this.tokenEstimate = tokenEstimate;
  }
}

export function estimatePromptTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function classifyPromptSize(text: string): PromptSizeClass {
  const tokens = estimatePromptTokens(text);
  if (tokens >= HUGE_PROMPT_TOKEN_THRESHOLD) return "huge";
  if (tokens >= 1500) return "medium";
  return "small";
}

export function requiresHugePromptIntake(text: string): boolean {
  return classifyPromptSize(text) === "huge";
}

export function requiresChunkedIntake(text: string): boolean {
  return text.length >= CHUNKED_INTAKE_CHAR_THRESHOLD || estimatePromptTokens(text) >= 20_000;
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 20).trimEnd()}… [truncated]`;
}

export function sliceToTokenBudget(text: string, maxTokens: number): string {
  return truncateToTokenBudget(text, maxTokens);
}

export function enforceCompressedPlanLimit(text: string): string {
  return truncateToTokenBudget(text, MAX_HEAVY_EXECUTION_BRIEF_TOKENS);
}

export function validateExecutionBriefTokens(text: string): void {
  const tokens = estimatePromptTokens(text);
  if (tokens > MAX_HEAVY_EXECUTION_BRIEF_TOKENS) {
    throw new ExecutionBriefTooLargeError(tokens);
  }
}

/** Repair oversized brief by stripping lower-priority sections until within cap. */
export function repairExecutionBrief(text: string): string {
  let current = text.trim();
  if (estimatePromptTokens(current) <= MAX_HEAVY_EXECUTION_BRIEF_TOKENS) return current;

  const stripSections = [
    /## Open questions[\s\S]*/i,
    /## Queued for later[\s\S]*/i,
    /Queue for next pass:[^\n]*/i,
    /Build now:[^\n]*/i,
  ];

  for (const pattern of stripSections) {
    current = current.replace(pattern, "").trim();
    if (estimatePromptTokens(current) <= MAX_HEAVY_EXECUTION_BRIEF_TOKENS) {
      return enforceCompressedPlanLimit(current);
    }
  }

  return enforceCompressedPlanLimit(current);
}

export function enforceExecutionBriefHardCap(text: string): string {
  const repaired = repairExecutionBrief(text);
  validateExecutionBriefTokens(repaired);
  return repaired;
}

export function estimateHeavyInputTokens(parts: string[]): number {
  return parts.reduce((sum, part) => sum + estimatePromptTokens(part), 0);
}

/** Returns true when a huge raw prompt is not embedded in heavy-model input. */
export function rawPromptBlockedFromHeavyModel(rawPrompt: string, heavyInput: string): boolean {
  if (!requiresHugePromptIntake(rawPrompt)) return true;
  const probe = rawPrompt.slice(0, Math.min(500, rawPrompt.length));
  return !heavyInput.includes(probe);
}
