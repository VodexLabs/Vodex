import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type OnboardingSurveySegment = {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type OnboardingUserRow = {
  userId: string;
  email: string | null;
  displayName: string | null;
  hearAbout: string | null;
  buildGoal: string | null;
  promoCode: string | null;
  useCase: string | null;
  experienceLevel: string | null;
  completedAt: string | null;
  answers: Record<string, unknown>;
};

export type OnboardingInsightsPayload = {
  totalCompleted: number;
  hearAbout: OnboardingSurveySegment[];
  buildGoals: OnboardingSurveySegment[];
  experienceLevels: OnboardingSurveySegment[];
  users: OnboardingUserRow[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

const CHART_COLORS = [
  "#1e6bff",
  "#7c3aed",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#0891b2",
  "#dc2626",
  "#6366f1",
];

function pickHearAbout(
  row: { referral_source?: string | null; answers?: unknown },
  profileAnswers?: unknown,
): string | null {
  const direct = row.referral_source?.trim();
  if (direct) return direct;

  for (const blob of [row.answers, profileAnswers]) {
    if (blob && typeof blob === "object" && !Array.isArray(blob)) {
      const a = blob as Record<string, unknown>;
      const fromAnswers =
        (typeof a.hear_about === "string" && a.hear_about) ||
        (typeof a.heard_about_us === "string" && a.heard_about_us) ||
        (typeof a.referral_source === "string" && a.referral_source);
      if (fromAnswers) return String(fromAnswers).trim();
    }
  }
  return null;
}

function aggregateCounts(
  rows: Array<{ label: string }>,
): OnboardingSurveySegment[] {
  const map = new Map<string, number>();
  for (const { label } of rows) {
    const key = label.trim() || "Not specified";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({
      key: label.toLowerCase().replace(/\s+/g, "_").slice(0, 48),
      label,
      count,
      percent: Math.round((count / total) * 1000) / 10,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
}

export async function loadOnboardingInsights(options: {
  limit?: number;
  offset?: number;
}): Promise<OnboardingInsightsPayload> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const admin = createSupabaseAdmin();

  const { data: onboardingRows, error: onboardingErr } = await admin
    .from("onboarding")
    .select(
      "user_id, completed_at, referral_source, use_case, experience_level, answers, workspace_name",
    )
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (onboardingErr) {
    throw new Error(onboardingErr.message);
  }

  const completed = onboardingRows ?? [];
  const userIds = completed.map((r) => r.user_id as string).filter(Boolean);

  const profilesById = new Map<
    string,
    { email: string | null; display_name: string | null; onboarding_answers: unknown }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, display_name, full_name, onboarding_answers, use_case, experience_level, referred_by")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      profilesById.set(p.id as string, {
        email: (p.email as string | null) ?? null,
        display_name:
          (p.display_name as string | null) ??
          (p.full_name as string | null) ??
          null,
        onboarding_answers: p.onboarding_answers,
      });
    }
  }

  const hearRows: Array<{ label: string }> = [];
  const buildRows: Array<{ label: string }> = [];
  const expRows: Array<{ label: string }> = [];

  const allUsers: OnboardingUserRow[] = completed.map((row) => {
    const userId = row.user_id;
    const profile = profilesById.get(userId);
    const hearAbout = pickHearAbout(row, profile?.onboarding_answers);
    const buildGoal = row.use_case?.trim() || row.workspace_name?.trim() || null;
    const exp = row.experience_level?.trim() ?? null;
    const answers =
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : profile?.onboarding_answers &&
            typeof profile.onboarding_answers === "object" &&
            !Array.isArray(profile.onboarding_answers)
          ? (profile.onboarding_answers as Record<string, unknown>)
          : {};

    hearRows.push({ label: hearAbout ?? "Not specified" });
    buildRows.push({ label: buildGoal ?? "Not specified" });
    expRows.push({ label: exp ?? "Not specified" });

    return {
      userId,
      email: profile?.email ?? null,
      displayName: profile?.display_name ?? null,
      hearAbout,
      buildGoal,
      promoCode: null,
      useCase: row.use_case?.trim() ?? null,
      experienceLevel: exp,
      completedAt: row.completed_at ?? null,
      answers,
    };
  });

  const page = allUsers.slice(offset, offset + limit);

  return {
    totalCompleted: allUsers.length,
    hearAbout: aggregateCounts(hearRows),
    buildGoals: aggregateCounts(buildRows),
    experienceLevels: aggregateCounts(expRows),
    users: page,
    hasMore: offset + limit < allUsers.length,
    offset,
    limit,
  };
}
