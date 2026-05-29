/**
 * DreamOS86 platform billing via Paddle (Merchant of Record).
 * Generated apps use separate payment connectors — not this module.
 */

export const PADDLE_ENV_KEYS = [
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
  "PADDLE_STARTER_PRICE_ID",
  "PADDLE_PRO_PRICE_ID",
  "PADDLE_INFINITY_PRICE_ID",
] as const;

export type PaddleCheckoutPlan = "starter" | "pro" | "infinity";

export function paddleBillingConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY?.trim() &&
      process.env.PADDLE_STARTER_PRICE_ID?.trim() &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim(),
  );
}

export function missingPaddleEnvVars(): string[] {
  const missing: string[] = [];
  for (const key of PADDLE_ENV_KEYS) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
  return missing;
}

export function getPaddlePriceId(plan: PaddleCheckoutPlan): string | null {
  switch (plan) {
    case "starter":
      return process.env.PADDLE_STARTER_PRICE_ID?.trim() || null;
    case "pro":
      return process.env.PADDLE_PRO_PRICE_ID?.trim() || null;
    case "infinity":
      return process.env.PADDLE_INFINITY_PRICE_ID?.trim() || null;
    default:
      return null;
  }
}

export type PaddleBillingStatus = {
  configured: boolean;
  primary: "paddle";
  fallbackStripe: boolean;
  missing: string[];
  userMessage: string;
};

export function getPaddleBillingStatus(): PaddleBillingStatus {
  const missing = missingPaddleEnvVars();
  const configured = paddleBillingConfigured();
  const stripeFallback = Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  return {
    configured,
    primary: "paddle",
    fallbackStripe: stripeFallback,
    missing,
    userMessage: configured
      ? "Paddle billing is configured."
      : missing.length > 0
        ? "Subscription checkout is being set up. Your workspace stays active on Free until billing is enabled."
        : "Billing is not configured.",
  };
}
