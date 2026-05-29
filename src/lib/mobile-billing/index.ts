/**
 * Mobile store billing (Google Play, Apple IAP) via RevenueCat for wrapped apps.
 * Separate from web checkout providers under generated-app-payments.
 */
export type MobileBillingPlatform = "android" | "ios" | "both";

export const MOBILE_BILLING_SETUP_STATUSES = [
  "not_started",
  "needs_store_setup",
  "needs_revenuecat",
  "ready",
  "error",
] as const;
