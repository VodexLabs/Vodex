/** Social activity ranks — never derived from paid plan. */

export const USER_RANKS = [
  { id: "new_builder", label: "New Builder", minScore: 0 },
  { id: "builder", label: "Builder", minScore: 15 },
  { id: "creator", label: "Creator", minScore: 40 },
  { id: "prototyper", label: "Prototyper", minScore: 75 },
  { id: "launch_maker", label: "Launch Maker", minScore: 120 },
  { id: "community_mentor", label: "Community Mentor", minScore: 200 },
  { id: "top_builder", label: "Top Builder", minScore: 320 },
  { id: "legendary_builder", label: "Legendary Builder", minScore: 500 },
] as const;

export type UserRankId = (typeof USER_RANKS)[number]["id"];

export type UserRankSignals = {
  appsCreated: number;
  publishedApps: number;
  communityPosts: number;
  commentsReplies: number;
  receivedLikes: number;
  followers: number;
  profileVisits: number;
};

export function scoreUserRankActivity(signals: UserRankSignals): number {
  return (
    signals.appsCreated * 4 +
    signals.publishedApps * 12 +
    signals.communityPosts * 6 +
    signals.commentsReplies * 2 +
    signals.receivedLikes * 1 +
    signals.followers * 3 +
    Math.min(signals.profileVisits, 200) * 0.25
  );
}

export function resolveUserRank(signals: UserRankSignals): {
  id: UserRankId;
  label: string;
  score: number;
} {
  const score = scoreUserRankActivity(signals);
  let picked: (typeof USER_RANKS)[number] = USER_RANKS[0]!;
  for (const rank of USER_RANKS) {
    if (score >= rank.minScore) picked = rank;
  }
  return { id: picked.id, label: picked.label, score };
}

export function rankLabelForId(id: string | null | undefined): string {
  const found = USER_RANKS.find((r) => r.id === id);
  return found?.label ?? "New Builder";
}

/** Fields that must never appear on public profiles. */
export const PRIVATE_PROFILE_FIELDS = [
  "plan_id",
  "credits_remaining",
  "email",
  "subscription_status",
  "billing_period_start",
  "billing_period_end",
  "monthly_token_limit",
  "tokens_used_this_period",
] as const;
