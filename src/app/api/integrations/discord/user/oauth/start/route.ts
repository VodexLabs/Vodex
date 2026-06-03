import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/app-url";
import {
  discordOAuthConfigured,
  getDiscordClientId,
} from "@/lib/integrations/server/discord-config";
import { buildDiscordOAuthState } from "@/lib/integrations/server/discord-oauth-state";

export const dynamic = "force-dynamic";

/** Link Discord account to Vodex user for subscription role sync. */
export async function GET(req: Request) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!discordOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Discord OAuth not configured",
        hint: "Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/settings/integrations";
  const state = buildDiscordOAuthState(user.id, returnTo);
  const redirectUri = `${getAppUrl().replace(/\/$/, "")}/api/integrations/discord/callback`;

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("client_id", getDiscordClientId());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify guilds.join");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
