import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/app-url";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getDiscordClientId,
  getDiscordClientSecret,
} from "@/lib/integrations/server/discord-config";
import { parseDiscordOAuthState } from "@/lib/integrations/server/discord-oauth-state";
import { addGuildMember, fetchDiscordUser } from "@/lib/integrations/server/discord-guild-api";
import { saveUserProviderConnection } from "@/lib/integrations/server/user-provider-connections";
import {
  scheduleDiscordRoleSync,
  syncDiscordRoleForUser,
} from "@/lib/integrations/server/sync-discord-role-for-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const base = getAppUrl().replace(/\/$/, "");

  const redirectError = (returnTo: string, reason: string) =>
    NextResponse.redirect(
      `${base}${returnTo}${returnTo.includes("?") ? "&" : "?"}discord=error&reason=${encodeURIComponent(reason)}`,
    );

  if (!code || !state) {
    return NextResponse.redirect(`${base}/settings/integrations?discord=error&reason=missing_code`);
  }

  const parsed = parseDiscordOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${base}/settings/integrations?discord=error&reason=invalid_state`);
  }

  const sessionUser = await getServerSessionUser();
  if (!sessionUser || sessionUser.id !== parsed.userId) {
    return redirectError(parsed.returnTo, "session_mismatch");
  }

  const redirectUri = `${base}/api/integrations/discord/callback`;
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getDiscordClientId(),
      client_secret: getDiscordClientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    token_type?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectError(parsed.returnTo, tokenJson.error ?? "token_exchange_failed");
  }

  const discordUser = await fetchDiscordUser(tokenJson.access_token);
  if (!discordUser) {
    return redirectError(parsed.returnTo, "discord_user_fetch_failed");
  }

  const displayName = discordUser.global_name?.trim() || discordUser.username;
  const admin = createSupabaseAdmin();

  await saveUserProviderConnection({
    userId: parsed.userId,
    provider: "discord",
    accessToken: tokenJson.access_token,
    displayName,
    metadata: {
      discord_user_id: discordUser.id,
      username: discordUser.username,
      oauth: true,
    },
  });

  await admin
    .from("profiles")
    .update({
      discord_user_id: discordUser.id,
      discord_username: displayName,
      discord_linked_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.userId);

  await addGuildMember(discordUser.id, tokenJson.access_token);

  const sync = await syncDiscordRoleForUser(parsed.userId, { source: "discord_oauth_callback" });
  if (!sync.ok) {
    scheduleDiscordRoleSync(parsed.userId, { source: "discord_oauth_callback_retry" });
  }

  return NextResponse.redirect(
    `${base}${parsed.returnTo}${parsed.returnTo.includes("?") ? "&" : "?"}discord=linked`,
  );
}
