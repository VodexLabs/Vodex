/** Max Action Credit balance support can set via admin OTP flow. */
export const ADMIN_ACTION_CREDIT_BALANCE_MAX = 20_000;

export function clampAdminActionCreditBalance(raw: number): number {
  return Math.min(Math.max(0, raw), ADMIN_ACTION_CREDIT_BALANCE_MAX);
}
