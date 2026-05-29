import { isPaidPlan } from "@/lib/billing/plan-features";

/** Connecting live payment providers requires a paid DreamOS86 plan. */
export function canConnectAppPayments(planId: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return isPaidPlan(planId);
}

export function paymentsGateMessage(): string {
  return "Upgrade to a paid plan to connect payment providers for your app.";
}
