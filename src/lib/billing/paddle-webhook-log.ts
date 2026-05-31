/**
 * Structured Paddle webhook / entitlement logs for production diagnostics.
 */
export type PaddleWebhookLogFields = {
  transaction_id?: string | null;
  user_id?: string | null;
  price_id?: string | null;
  current_plan?: string | null;
  target_plan?: string | null;
  action_type?: string | null;
  event_type?: string | null;
  event_id?: string | null;
  processing_status?: string | null;
  entitlement_applied?: boolean;
  credits_before?: number | null;
  credits_after?: number | null;
  duplicate?: boolean;
  error?: string | null;
  environment?: string | null;
};

export function logPaddleWebhook(fields: PaddleWebhookLogFields): void {
  const payload = {
    scope: "paddle_webhook",
    ts: new Date().toISOString(),
    ...fields,
  };
  if (fields.processing_status === "failed" || fields.error) {
    console.error("[dreamos:paddle-webhook]", JSON.stringify(payload));
  } else {
    console.info("[dreamos:paddle-webhook]", JSON.stringify(payload));
  }
}
