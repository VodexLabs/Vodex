/** Credits granted to referrer and referred user per successful referral. */
export const REFERRAL_CREDITS_PER_USER = 5;

/** Max invites per referrer. */
export const MAX_REFERRALS_PER_USER = 5;

/** Canonical public origin for share/copy links — never localhost. */
export const REFERRAL_SHARE_ORIGIN = "https://dreamos86.com";

/** Always dreamos86.com so dev tabs never share localhost invite links. */
export function buildReferralInviteUrl(code: string, _requestOrigin?: string): string {
  return `${REFERRAL_SHARE_ORIGIN}/auth/sign-up?ref=${encodeURIComponent(code.trim().toUpperCase())}`;
}
