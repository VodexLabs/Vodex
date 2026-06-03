import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { discordOAuthConfigured } from "@/lib/integrations/server/discord-config";
import { vodexPlanToDiscordTier } from "@/lib/integrations/server/discord-plan-tier";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "plan_id, discord_user_id, discord_username, discord_linked_at, discord_role_sync_status, discord_role_sync_error, discord_role_synced_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const connected = Boolean(profile?.discord_user_id);
  const expectedTier = vodexPlanToDiscordTier(profile?.plan_id);

  return NextResponse.json({
    configured: discordOAuthConfigured(),
    connected,
    discordUserId: profile?.discord_user_id ?? null,
    discordUsername: profile?.discord_username ?? null,
    linkedAt: profile?.discord_linked_at ?? null,
    syncStatus: profile?.discord_role_sync_status ?? (connected ? null : "not_connected"),
    syncError: profile?.discord_role_sync_error ?? null,
    syncedAt: profile?.discord_role_synced_at ?? null,
    expectedTier,
    planId: profile?.plan_id ?? "free",
    message: connected
      ? null
      : "Connect Discord to unlock your community role",
  });
}
