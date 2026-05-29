/**
 * User-facing credit pricing constants — visible labels only; no provider costs.
 */

/** @deprecated Use floor + markup pricing — kept for legacy UI fallbacks. */
export const DISCUSS_FLAT_CREDITS = 0.4;

/** @deprecated Use floor + markup pricing — kept for legacy UI fallbacks. */
export const CREATE_QUESTION_FLAT_CREDITS = 0.8;

export const DISCUSS_FLAT_LABEL = "Uses Build Credits when successful";

export const CREATE_QUESTION_FLAT_LABEL = "Uses Build Credits when successful";

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
  return "Uses Build Credits when successful.";
}

export function createQuestionInputHintLabel(): string {
  return "Uses Build Credits when successful.";
}

/** Minimum chargeable amount (supports decimal discuss flat). */
export const MIN_CHARGEABLE_CREDITS = 0.1;
