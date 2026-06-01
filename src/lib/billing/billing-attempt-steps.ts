import type { BillingAttemptDiagnosis } from "@/lib/billing/diagnose-billing-attempt";
import type { BillingAttemptTrace } from "@/lib/billing/billing-attempt-trace";
import type { BillingTruth } from "@/lib/billing/billing-truth";

export type AttemptStepStatus = "pending" | "success" | "failed" | "skipped";

export type BillingAttemptStep = {
  id: string;
  label: string;
  status: AttemptStepStatus;
  reason: string | null;
};

export function buildBillingAttemptSteps(input: {
  trace: BillingAttemptTrace | null;
  diagnosis: BillingAttemptDiagnosis | null;
  truth: BillingTruth | null;
  clientClicked?: boolean;
  apiResponseOk?: boolean | null;
  apiError?: string | null;
  checkoutUrlCreated?: boolean | null;
}): BillingAttemptStep[] {
  const t = input.trace;
  const d = input.diagnosis;

  const noSubInternal =
    input.truth &&
    !input.truth.hasPaddleSubscription &&
    input.truth.profilePlan !== "free";

  return [
    step(
      "client_clicked",
      "Client clicked button",
      input.clientClicked
        ? "success"
        : t?.frontend_started
          ? "success"
          : "pending",
      null,
    ),
    step(
      "request_sent",
      "Request sent to API",
      t?.api_called === false
        ? "failed"
        : t?.api_called || input.apiResponseOk != null
          ? "success"
          : input.clientClicked
            ? "pending"
            : "pending",
      t?.api_called === false ? "client_request_not_sent" : null,
    ),
    step(
      "api_route",
      "API route called",
      t?.endpoint_called
        ? "success"
        : input.apiResponseOk === false
          ? "failed"
          : "pending",
      t?.endpoint_called ?? input.apiError ?? null,
    ),
    step(
      "action_resolved",
      "Billing action resolved",
      t?.resolved_action
        ? "success"
        : "pending",
      t?.resolved_action
        ? noSubInternal
          ? "no_paddle_subscription_existing_user_internal_plan_only → checkout"
          : t.resolved_action
        : null,
    ),
    step(
      "paddle_request",
      "Paddle request started",
      t?.paddle_request_started
        ? "success"
        : t?.failure_code === "paddle_action_failed"
          ? "failed"
          : t?.endpoint_called
            ? "pending"
            : "skipped",
      null,
    ),
    step(
      "paddle_response",
      "Paddle response received",
      t?.paddle_response_received
        ? "success"
        : t?.failure_code === "paddle_action_failed"
          ? "failed"
          : t?.paddle_request_started
            ? "pending"
            : "skipped",
      t?.failure_message ?? null,
    ),
    step(
      "checkout_redirect",
      "Checkout URL / redirect created",
      input.checkoutUrlCreated === true || t?.checkout_url_created
        ? "success"
        : input.checkoutUrlCreated === false || t?.failure_code === "paddle_checkout_not_created"
          ? "failed"
          : t?.resolved_action === "upgrade" || t?.resolved_action === "switch_interval"
            ? "skipped"
            : "pending",
      t?.failure_code === "paddle_checkout_not_created"
        ? "paddle_checkout_not_created"
        : null,
    ),
    step(
      "waiting_webhook",
      "Waiting for Paddle webhook",
      d?.code === "paddle_webhook_not_received"
        ? "failed"
        : t?.webhook_received || d?.success
          ? "success"
          : t?.paddle_response_received || t?.checkout_url_created
            ? "pending"
            : "skipped",
      d?.code === "paddle_webhook_not_received" ? d.message : null,
    ),
    step(
      "webhook_received",
      "Webhook received",
      t?.webhook_received
        ? "success"
        : d?.code === "paddle_webhook_not_received"
          ? "failed"
          : "pending",
      t?.webhook_event_type ?? null,
    ),
    step(
      "entitlement_applied",
      "Entitlement applied",
      t?.entitlement_apply_completed
        ? "success"
        : t?.entitlement_apply_started
          ? "pending"
          : t?.webhook_received
            ? "pending"
            : "skipped",
      t?.failure_message ?? d?.message ?? null,
    ),
    step(
      "plan_updated",
      "Plan updated",
      d?.success || (t?.plan_after && t.plan_after === t.target_storage_plan)
        ? "success"
        : d?.code === "plan_not_updated"
          ? "failed"
          : "pending",
      d?.code === "plan_not_updated" ? d.message : null,
    ),
    step(
      "build_credits_updated",
      "Build credits updated",
      d?.success || (t?.build_credits_after != null && t.build_credits_after >= t.target_build_credits_expected - 0.5)
        ? "success"
        : d?.code === "build_credits_not_updated"
          ? "failed"
          : "pending",
      d?.code === "build_credits_not_updated" ? d.message : null,
    ),
    step(
      "action_credits_updated",
      "Action credits updated",
      d?.success ||
        (t?.action_credits_after != null &&
          t.action_credits_after >= t.target_action_credits_expected - 0.5)
        ? "success"
        : d?.code === "action_credits_not_updated"
          ? "failed"
          : "pending",
      d?.code === "action_credits_not_updated" ? d.message : null,
    ),
    step(
      "billing_period_updated",
      "Billing period updated",
      d?.success ||
        (t?.period_end_after != null && t.period_end_after !== t.current_period_end_before)
        ? "success"
        : d?.code === "billing_period_not_updated"
          ? "failed"
          : "pending",
      d?.code === "billing_period_not_updated" ? d.message : null,
    ),
  ];
}

function step(
  id: string,
  label: string,
  status: AttemptStepStatus,
  reason: string | null,
): BillingAttemptStep {
  return { id, label, status, reason };
}
