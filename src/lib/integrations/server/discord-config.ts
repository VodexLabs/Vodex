/** Server-only Discord integration config (never expose bot token to client). */

export type DiscordSubscriptionTier = "builder" | "starter" | "pro" | "infinity";

export function discordOAuthConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID?.trim() &&
      process.env.DISCORD_CLIENT_SECRET?.trim() &&
      process.env.DISCORD_BOT_TOKEN?.trim() &&
      process.env.DISCORD_GUILD_ID?.trim(),
  );
}

export function discordRoleSyncConfigured(): boolean {
  return (
    discordOAuthConfigured() &&
    Boolean(process.env.DISCORD_ROLE_BUILDER_ID?.trim())
  );
}

export function getDiscordGuildId(): string {
  return process.env.DISCORD_GUILD_ID!.trim();
}

export function getDiscordBotToken(): string {
  return process.env.DISCORD_BOT_TOKEN!.trim();
}

export function getDiscordClientId(): string {
  return process.env.DISCORD_CLIENT_ID!.trim();
}

export function getDiscordClientSecret(): string {
  return process.env.DISCORD_CLIENT_SECRET!.trim();
}

export function getManagedDiscordRoleIds(): string[] {
  return [
    process.env.DISCORD_ROLE_BUILDER_ID?.trim(),
    process.env.DISCORD_ROLE_STARTER_ID?.trim(),
    process.env.DISCORD_ROLE_PRO_ID?.trim(),
    process.env.DISCORD_ROLE_INFINITY_ID?.trim(),
  ].filter((id): id is string => Boolean(id));
}

export function discordRoleIdForTier(tier: DiscordSubscriptionTier): string | null {
  const map: Record<DiscordSubscriptionTier, string | undefined> = {
    builder: process.env.DISCORD_ROLE_BUILDER_ID?.trim(),
    starter: process.env.DISCORD_ROLE_STARTER_ID?.trim(),
    pro: process.env.DISCORD_ROLE_PRO_ID?.trim(),
    infinity: process.env.DISCORD_ROLE_INFINITY_ID?.trim(),
  };
  return map[tier] ?? null;
}
