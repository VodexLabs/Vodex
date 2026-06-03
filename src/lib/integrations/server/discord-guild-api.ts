import {
  discordRoleIdForTier,
  getDiscordBotToken,
  getDiscordGuildId,
  getManagedDiscordRoleIds,
  type DiscordSubscriptionTier,
} from "@/lib/integrations/server/discord-config";

const DISCORD_API = "https://discord.com/api/v10";

type DiscordApiError = {
  code?: number;
  message?: string;
};

async function discordFetch(
  path: string,
  init: RequestInit & { auth?: "bot" | "bearer"; token?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.auth === "bot") {
    headers.set("Authorization", `Bot ${getDiscordBotToken()}`);
  } else if (init.auth === "bearer" && init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  return fetch(`${DISCORD_API}${path}`, { ...init, headers });
}

export async function fetchDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  global_name?: string | null;
} | null> {
  const res = await discordFetch("/users/@me", { auth: "bearer", token: accessToken });
  if (!res.ok) return null;
  const json = (await res.json()) as { id?: string; username?: string; global_name?: string | null };
  if (!json.id || !json.username) return null;
  return { id: json.id, username: json.username, global_name: json.global_name };
}

export async function addGuildMember(discordUserId: string, userAccessToken: string): Promise<boolean> {
  const res = await discordFetch(`/guilds/${getDiscordGuildId()}/members/${discordUserId}`, {
    method: "PUT",
    auth: "bot",
    body: JSON.stringify({ access_token: userAccessToken }),
  });
  return res.ok || res.status === 204;
}

export async function getGuildMember(discordUserId: string): Promise<{ roles: string[] } | null> {
  const res = await discordFetch(`/guilds/${getDiscordGuildId()}/members/${discordUserId}`, {
    auth: "bot",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as DiscordApiError;
    throw new Error(err.message ?? `Discord member lookup failed (${res.status})`);
  }
  const json = (await res.json()) as { roles?: string[] };
  return { roles: json.roles ?? [] };
}

export async function setGuildMemberRoles(
  discordUserId: string,
  roleIds: string[],
): Promise<void> {
  const res = await discordFetch(`/guilds/${getDiscordGuildId()}/members/${discordUserId}`, {
    method: "PATCH",
    auth: "bot",
    body: JSON.stringify({ roles: roleIds }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as DiscordApiError;
    throw new Error(err.message ?? `Discord role update failed (${res.status})`);
  }
}

/** Keeps manual staff roles; swaps only Vodex-managed subscription roles. */
export function mergeSubscriptionRoles(currentRoles: string[], tier: DiscordSubscriptionTier): string[] {
  const managed = new Set(getManagedDiscordRoleIds());
  const target = discordRoleIdForTier(tier);
  if (!target) {
    throw new Error(`Discord role not configured for tier: ${tier}`);
  }
  const preserved = currentRoles.filter((r) => !managed.has(r));
  if (!preserved.includes(target)) preserved.push(target);
  return preserved;
}
