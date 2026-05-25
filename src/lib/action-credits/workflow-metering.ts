import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";

export const WORKFLOW_LIMITS = {
  maxStepsPerWorkflow: 12,
  maxCreditsPerWorkflow: 50,
  maxCreditsPerVisitorSession: 25,
  maxCreditsPerAppPerDay: 500,
  stepTimeoutMs: 120_000,
};

export type WorkflowStepInput = {
  actionType: string;
  providerCostUsd?: number | null;
};

export function quoteWorkflowSteps(steps: WorkflowStepInput[]): {
  steps: ReturnType<typeof quoteActionCredits>[];
  totalActionCredits: number;
  capped: boolean;
} {
  const quotes = steps.map((s) => quoteActionCredits(s));
  let total = quotes.reduce((sum, q) => sum + q.finalActionCredits, 0);
  let capped = false;
  if (total > WORKFLOW_LIMITS.maxCreditsPerWorkflow) {
    total = WORKFLOW_LIMITS.maxCreditsPerWorkflow;
    capped = true;
  }
  return { steps: quotes, totalActionCredits: total, capped };
}
