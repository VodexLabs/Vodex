#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { resolveE2eUserEmail, readAuthFile } from "./lib/e2e-live.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
}

const email = resolveE2eUserEmail({ ...process.env, ...env });
console.log("resolved email:", email);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: prof } = await admin.from("profiles").select("id,email,credits_remaining").eq("email", email).maybeSingle();
console.log("profile by email:", prof);

if (!prof) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 20 });
  const match = users?.users?.find((u) => u.email === email);
  console.log("auth user:", match?.id, match?.email);
  if (match) {
    const { data: byId } = await admin.from("profiles").select("id,email").eq("id", match.id).maybeSingle();
    console.log("profile by id:", byId);
  }
}
