import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildReferralInviteUrl } from "@/lib/referrals/referral-config";
import { loadReferralDashboard } from "@/lib/referrals/referral-dashboard";
import { resolveRequestOrigin } from "@/lib/url/app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/referrals — referral dashboard (fresh from DB via service role).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const origin = resolveRequestOrigin(request);
    const dashboard = await loadReferralDashboard(user.id, origin);

    return NextResponse.json(
    {
      code: dashboard.referralCode,
      inviteUrl: dashboard.referralLink,
      referralCode: dashboard.referralCode,
      referralLink: dashboard.referralLink,
      slotsUsed: dashboard.friendsInvited,
      slotsRemaining: dashboard.slotsRemaining,
      maxReferrals: dashboard.maxReferrals,
      creditsPerReferral: dashboard.perReferralBuildCredits,
      perReferralBuildCredits: dashboard.perReferralBuildCredits,
      maxReached: dashboard.maxReached,
      stats: {
        total: dashboard.friendsInvited,
        rewarded: dashboard.rewarded,
        creditsEarned: dashboard.creditsEarned,
      },
      friendsInvited: dashboard.friendsInvited,
      rewarded: dashboard.rewarded,
      creditsEarned: dashboard.creditsEarned,
      referrals: dashboard.activity.map((row) => ({
        id: row.id,
        name: row.displayName ?? row.email?.split("@")[0] ?? "User",
        email: row.email,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        joined: row.createdAt,
        status: row.status,
        creditsGranted: row.rewardCredits,
        rewardCredits: row.rewardCredits,
        rewardedAt: row.rewardedAt,
      })),
      referredBy: dashboard.referredBy?.referralCode ?? null,
      referredByProfile: dashboard.referredBy,
      activity: dashboard.activity,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "referral_load_failed";
    console.error("[referrals] dashboard load failed:", message);
    let code = dashboardFallbackCode(user.id);
    try {
      const admin = createSupabaseAdmin();
      const { data: profile } = await admin
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.referral_code) code = String(profile.referral_code).trim().toUpperCase();
    } catch {
      /* use derived fallback */
    }
    const inviteUrl = buildReferralInviteUrl(code);
    return NextResponse.json(
      {
        code,
        inviteUrl,
        referralCode: code,
        slotsUsed: 0,
        slotsRemaining: 5,
        maxReferrals: 5,
        creditsPerReferral: 5,
        maxReached: false,
        stats: { total: 0, rewarded: 0, creditsEarned: 0 },
        referrals: [],
        referredBy: null,
        referredByProfile: null,
        warning: "Stats are syncing — your share link is ready. Tap Refresh in a moment.",
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

function dashboardFallbackCode(userId: string): string {
  const compact = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return compact.padEnd(8, "0").slice(0, 8);
}
