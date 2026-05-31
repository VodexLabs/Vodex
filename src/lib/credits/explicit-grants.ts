/** Max explicit bonus (referral / support grants) per billing period — plan quota is separate. */
export const EXPLICIT_BONUS_CAP = 1500;

export const EXPLICIT_GRANT_SOURCES = new Set([
  "admin_grant",
  "referral",
  "grant",
  "purchase",
  "top_up",
]);

type LedgerRow = {
  amount?: number;
  source?: string;
  metadata?: unknown;
  created_at?: string;
};

/**
 * `credits_reset_at` is the next reset time (end of current period).
 * Grants before period start do not count toward active bonus.
 */
export function creditPeriodStart(creditsResetAt: string | null | undefined): Date {
  if (!creditsResetAt) {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  const end = new Date(creditsResetAt);
  if (Number.isNaN(end.getTime())) {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  const now = Date.now();
  if (end.getTime() <= now) {
    return end;
  }
  return new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export function capExplicitBonus(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(Math.min(amount, EXPLICIT_BONUS_CAP) * 10) / 10;
}

export function explicitBuildGrantAmount(row: LedgerRow): number {
  const source = String(row.source ?? "");
  const amount = Math.abs(Number(row.amount) || 0);
  if (amount <= 0) return 0;
  if (EXPLICIT_GRANT_SOURCES.has(source)) return amount;
  if (source === "adjustment") {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (meta.via === "grant_credits_admin" || meta.via === "grant_credits") {
      return amount;
    }
  }
  return 0;
}

export function isGrantInCreditPeriod(createdAt: string | undefined, periodStart: Date): boolean {
  if (!createdAt) return true;
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return true;
  return at.getTime() >= periodStart.getTime();
}
