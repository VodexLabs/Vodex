/**
 * User-facing credit pricing constants — visible labels only; no provider costs.
 */

/** @deprecated Discuss/create now bill 3× provider cost — kept for legacy UI fallbacks. */
export const DISCUSS_FLAT_CREDITS = 0.4;

/** @deprecated Discuss/create now bill 3× provider cost — kept for legacy UI fallbacks. */
export const CREATE_QUESTION_FLAT_CREDITS = 0.8;

export const DISCUSS_FLAT_LABEL = "Billed at 3× provider cost";

export const CREATE_QUESTION_FLAT_LABEL = "Billed at 3× provider cost";

export function discussFlatCreditsUsedLabel(credits = DISCUSS_FLAT_CREDITS): string {
  const rounded = Math.round(credits * 10) / 10;
  const text =
    Math.abs(rounded - Math.round(rounded)) < 0.05
      ? String(Math.round(rounded))
      : rounded.toFixed(1);
  return `${text} credits used`;
}

export function createQuestionFlatCreditsUsedLabel(credits = CREATE_QUESTION_FLAT_CREDITS): string {
  return discussFlatCreditsUsedLabel(credits);
}

export function discussInputHintLabel(): string {
  return "Discuss is billed at 3× our provider cost based on actual usage.";
}

export function createQuestionInputHintLabel(): string {
  return "Create questions are billed at 3× our provider cost based on actual usage.";
}

/** Minimum chargeable amount (supports decimal discuss flat). */
export const MIN_CHARGEABLE_CREDITS = 0.1;
