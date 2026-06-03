import { createHmac, randomBytes } from "crypto";

function stateSecret(): string {
  return (
    process.env.DISCORD_OAUTH_STATE_SECRET?.trim() ??
    process.env.GITHUB_OAUTH_STATE_SECRET?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    "dev-discord-state"
  );
}

export function signDiscordOAuthState(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("hex").slice(0, 16);
}

export function buildDiscordOAuthState(userId: string, returnTo: string): string {
  const nonce = randomBytes(8).toString("hex");
  const raw = `discord:user:${userId}:${encodeURIComponent(returnTo)}:${nonce}`;
  return `${Buffer.from(raw).toString("base64url")}.${signDiscordOAuthState(raw)}`;
}

export function parseDiscordOAuthState(state: string): { userId: string; returnTo: string } | null {
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;
  let raw: string;
  try {
    raw = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (signDiscordOAuthState(raw) !== sig) return null;
  const parts = raw.split(":");
  if (parts[0] !== "discord" || parts[1] !== "user" || !parts[2]) return null;
  return {
    userId: parts[2]!,
    returnTo: decodeURIComponent(parts[3] ?? "/settings/integrations"),
  };
}
