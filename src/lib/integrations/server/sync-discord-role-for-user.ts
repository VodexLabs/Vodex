import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  discordRoleSyncConfigured,
  type DiscordSubscriptionTier,
} from "@/lib/integrations/server/discord-config";
import { vodexPlanToDiscordTier } from "@/lib/integrations/server/discord-plan-tier";
import {
  addGuildMember,
  getGuildMember,
  mergeSubscriptionRoles,
  setGuildMemberRoles,
} from "@/lib/integrations/server/discord-guild-api";
import { getUserProviderAccessToken } from "@/lib/integrations/server/user-provider-connections";

export type DiscordRoleSyncResult = {
  ok: boolean;
  status: "synced" | "not_connected" | "not_configured" | "not_in_guild" | "error";
  tier?: DiscordSubscriptionTier;
  message?: string;
};

async function writeSyncStatus(
  userId: string,
  status: DiscordRoleSyncResult["status"],
  error?: string | null,
) {
  const admin = createSupabaseAdmin();
  await admin
    .from("profiles")
    .update({
      discord_role_sync_status: status,
      discord_role_sync_error: error ?? null,
      discord_role_synced_at: status === "synced" ? new Date().toISOString() : null,
    } as never)
    .eq("id", userId);
}

/**
 * Assigns the Vodex subscription Discord role for a user (server-side only).
 * Never removes Founder / Core Team / Moderator / Support roles.
 */
export async function syncDiscordRoleForUser(
  userId: string,
  options?: { source?: string; planIdOverride?: string },
): Promise<DiscordRoleSyncResult> {
  if (!discordRoleSyncConfigured()) {
    return { ok: false, status: "not_configured", message: "Discord role sync is not configured" };
  }

  const admin = createSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("discord_user_id, discord_username, plan_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile?.discord_user_id) {
    await writeSyncStatus(userId, "not_connected", null);
    return {
      ok: false,
      status: "not_connected",
      message: "Connect Discord to unlock your community role",
    };
  }

  const discordUserId = profile.discord_user_id as string;
  const planId = options?.planIdOverride ?? profile.plan_id ?? "free";
  const tier = vodexPlanToDiscordTier(planId);

  try {
    let member = await getGuildMember(discordUserId);
    if (!member) {
      const oauthToken = await getUserProviderAccessToken(userId, "discord");
      if (oauthToken) {
        const joined = await addGuildMember(discordUserId, oauthToken);
        if (joined) member = await getGuildMember(discordUserId);
      }
    }

    if (!member) {
      await writeSyncStatus(userId, "not_in_guild", "User is not in the Vodex Discord server");
      return {
        ok: false,
        status: "not_in_guild",
        tier,
        message: "Join the Vodex Discord server, then sync again",
      };
    }

    const nextRoles = mergeSubscriptionRoles(member.roles, tier);
    await setGuildMemberRoles(discordUserId, nextRoles);
    await writeSyncStatus(userId, "synced", null);

    await admin.from("user_provider_connections").upsert(
      {
        user_id: userId,
        provider: "discord",
        status: "connected",
        metadata: {
          discord_user_id: discordUserId,
          tier,
          last_sync_source: options?.source ?? "manual",
          last_sync_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,provider" },
    );

    return {
      ok: true,
      status: "synced",
      tier,
      message: `Synced ${tier} role for ${profile.discord_username ?? discordUserId}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Discord sync failed";
    await writeSyncStatus(userId, "error", msg);
    return { ok: false, status: "error", tier, message: msg };
  }
}

/** Fire-and-forget wrapper for webhooks / billing (never blocks entitlement). */
export function scheduleDiscordRoleSync(
  userId: string,
  options?: { source?: string; planIdOverride?: string },
): void {
  void syncDiscordRoleForUser(userId, options).catch((err) => {
    console.error("[discord] role sync failed", {
      userId,
      source: options?.source,
      error: err instanceof Error ? err.message : err,
    });
  });
}

export async function clearDiscordLink(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("discord_user_id")
    .eq("id", userId)
    .maybeSingle();

  const discordUserId = profile?.discord_user_id as string | undefined;
  if (discordUserId && discordRoleSyncConfigured()) {
    try {
      const member = await getGuildMember(discordUserId);
      if (member) {
        await setGuildMemberRoles(discordUserId, mergeSubscriptionRoles(member.roles, "builder"));
      }
    } catch {
      /* best-effort downgrade to Builder before unlink */
    }
  }

  await admin
    .from("profiles")
    .update({
      discord_user_id: null,
      discord_username: null,
      discord_linked_at: null,
      discord_role_sync_status: null,
      discord_role_sync_error: null,
      discord_role_synced_at: null,
    } as never)
    .eq("id", userId);

  await admin
    .from("user_provider_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "discord");
}
