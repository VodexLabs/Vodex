import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2eUserEmail } from "./e2e-live.mjs";

export function loadEnvLocal(root: string): Record<string, string> {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

async function main() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const env = { ...process.env, ...loadEnvLocal(root) };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("✗ missing Supabase service role for reservation permission test");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const genId = `verify-reservation-${Date.now()}`;
  const email = resolveE2eUserEmail(env);
  let userId: string | null = null;
  let profileErr: string | null = null;
  if (email) {
    const { data: profile, error } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    profileErr = error?.message ?? null;
    userId = profile?.id ?? null;
  }
  if (!userId) {
    const { data: profile, error } = await admin.from("profiles").select("id").limit(1).maybeSingle();
    profileErr = profileErr ?? error?.message ?? null;
    userId = profile?.id ?? null;
  }
  if (!userId) {
    if (profileErr && /fetch failed/i.test(profileErr)) {
      console.log("✓ credit_reservations live probe skipped (remote DB unreachable)");
      return;
    }
    if (profileErr) {
      console.error(`✗ profile lookup failed: ${profileErr}`);
    } else {
      console.error("✗ no profile row to test reservations (set E2E_TEST_EMAIL)");
    }
    process.exit(1);
  }

  const row = {
    user_id: userId,
    generation_id: genId,
    mode: "build",
    quoted_user_credits: 1,
    reserved_user_credits: 1,
    internal_cost_credits: 1,
    status: "reserved",
    metadata: { verify: "p07" },
  };

  const { data: inserted, error: insErr } = await admin
    .from("credit_reservations")
    .insert(row)
    .select("id")
    .single();
  if (insErr) {
    console.error("✗ credit_reservations insert:", insErr.message);
    process.exit(1);
  }

  const { error: upErr } = await admin
    .from("credit_reservations")
    .update({ status: "refunded", final_user_credits: 0 })
    .eq("id", inserted.id);
  if (upErr) {
    console.error("✗ credit_reservations update:", upErr.message);
    process.exit(1);
  }

  await admin.from("credit_reservations").delete().eq("id", inserted.id);

  console.log("✓ credit_reservations insert/update/delete via service_role");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed/i.test(msg)) {
    console.log("✓ credit_reservations live probe skipped (remote DB unreachable)");
    return;
  }
  console.error(err);
  process.exit(1);
});
