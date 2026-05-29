export type PaymentProviderId =
  | "paddle"
  | "stripe"
  | "lemon_squeezy"
  | "paypal"
  | "revenuecat";

export type PaymentConnectionMode = "test" | "live" | "sandbox";

export type PaymentConnectionStatus =
  | "not_connected"
  | "missing_config"
  | "connected"
  | "verified"
  | "webhook_missing"
  | "webhook_verified"
  | "error"
  | "disabled";

export type PaymentProductType = "subscription" | "one_time" | "credit_pack" | "usage";

export const WEB_PAYMENT_PROVIDERS: PaymentProviderId[] = [
  "paddle",
  "stripe",
  "lemon_squeezy",
  "paypal",
];

export const PROVIDER_LABELS: Record<PaymentProviderId, string> = {
  paddle: "Paddle",
  stripe: "Stripe",
  lemon_squeezy: "Lemon Squeezy",
  paypal: "PayPal Business",
  revenuecat: "RevenueCat (mobile)",
};

export const PROVIDER_TAGLINES: Record<PaymentProviderId, string> = {
  paddle: "Best for SaaS and digital subscriptions",
  stripe: "Best for custom checkout and marketplaces",
  lemon_squeezy: "Simple digital product and subscription checkout",
  paypal: "Optional PayPal checkout",
  revenuecat: "Mobile app subscriptions",
};

export const PROVIDER_SECRET_FIELDS: Record<PaymentProviderId, string[]> = {
  paddle: ["api_key", "webhook_secret", "client_token"],
  stripe: ["secret_key", "webhook_secret"],
  lemon_squeezy: ["api_key", "webhook_secret"],
  paypal: ["client_secret", "webhook_secret"],
  revenuecat: ["secret_api_key"],
};
