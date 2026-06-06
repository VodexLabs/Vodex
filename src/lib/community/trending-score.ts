/** Weighted trending score — not pure like-count sorting. */
export function discussionTrendingScore(input: {
  like_count: number;
  reply_count: number;
  save_count?: number;
  created_at: string;
  view_count?: number;
}): number {
  const likes = Math.max(0, input.like_count);
  const replies = Math.max(0, input.reply_count);
  const saves = Math.max(0, input.save_count ?? 0);
  const views = Math.max(0, input.view_count ?? 0);

  const ageHours = Math.max(
    1,
    (Date.now() - new Date(input.created_at).getTime()) / (1000 * 60 * 60),
  );
  const freshness = 1 / Math.pow(ageHours, 0.35);

  const engagement = likes * 2.2 + replies * 3.5 + saves * 4 + views * 0.08;
  return engagement * freshness;
}

export function sortByTrending<T extends {
  like_count: number;
  reply_count: number;
  save_count?: number;
  created_at: string;
  view_count?: number;
}>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      discussionTrendingScore(b) - discussionTrendingScore(a) ||
      b.like_count - a.like_count ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
