#!/usr/bin/env node
/**
 * VODEX — Discord subscription role integration (static).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel, errors) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`missing ${rel}`);
}

function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

const errors = [];

exists("supabase/migrations/20260732120000_p27_discord_subscription_roles.sql", errors);
exists("src/lib/integrations/server/sync-discord-role-for-user.ts", errors);
exists("src/app/api/integrations/discord/callback/route.ts", errors);
exists("src/components/settings/discord-account-card.tsx", errors);

const sync = read("src/lib/integrations/server/sync-discord-role-for-user.ts");
must(sync, "syncDiscordRoleForUser", "syncDiscordRoleForUser", errors);
must(sync, "scheduleDiscordRoleSync", "scheduleDiscordRoleSync", errors);
must(sync, "not_connected", "not connected status", errors);

must(read("src/lib/billing/apply-immediate-plan-upgrade.ts"), "scheduleDiscordRoleSync", "billing upgrade hook", errors);
must(read("src/lib/billing/sync-plan-credits.ts"), "scheduleDiscordRoleSync", "plan credits hook", errors);
must(read("src/components/settings/settings-integrations-view.tsx"), "DiscordAccountCard", "settings UI", errors);
must(read(".env.local.example"), "DISCORD_BOT_TOKEN", "env docs", errors);
function mustNot(src, needle, label, errors) {
  if (src.includes(needle)) errors.push(`should not contain: ${label}`);
}
mustNot(read("src/components/settings/discord-account-card.tsx"), "DISCORD_BOT_TOKEN", "bot token in client", errors);

if (errors.length) {
  console.error("verify:discord-subscription-roles FAILED\n");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("verify:discord-subscription-roles OK");
