#!/usr/bin/env node
/**
 * One OpenAI discuss-mode smoke test — single message, no Anthropic, no build.
 * Requires: dev server, OPENAI_API_KEY, auth (.playwright-auth.json or E2E creds).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { requireDevServer } from "./lib/dev-server.mjs";
import { readAuthFile, cookiesHeader } from "./lib/e2e-live.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

async function authCookie(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authFile = readAuthFile();
  if (authFile.ok) {
    const h = cookiesHeader(authFile.json);
    if (h) return { cookieHeader: h, source: "playwright-auth" };
  }
  const email = env.E2E_TEST_EMAIL?.trim();
  const password = env.E2E_TEST_PASSWORD?.trim();
  if (!email || !password || !url || !anonKey) {
    throw new Error("Need .playwright-auth.json or E2E_TEST_EMAIL/E2E_TEST_PASSWORD");
  }
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? "sign-in failed");
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  return {
    cookieHeader: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(data.session))}`,
    source: "e2e-password",
    userId: data.user.id,
    email: data.user.email,
  };
}

function parseStreamText(raw) {
  let out = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("0:")) continue;
    try {
      const chunk = JSON.parse(line.slice(2));
      if (typeof chunk === "string") out += chunk;
    } catch {
      /* ignore */
    }
  }
  if (out.trim()) return out.trim();
  const alt = raw.match(/"text"\s*:\s*"([^"]+)"/g);
  if (alt) {
    return alt
      .map((m) => m.replace(/^"text"\s*:\s*"/, "").replace(/"$/, ""))
      .join("")
      .slice(0, 500);
  }
  return raw.slice(0, 400).replace(/\s+/g, " ");
}

async function main() {
  console.log("\n=== smoke:openai-discuss (1 message, OpenAI only) ===\n");

  const envLocal = loadEnvLocal();
  const env = { ...process.env, ...envLocal };

  if (!env.OPENAI_API_KEY?.trim()) {
    console.error("✗ OPENAI_API_KEY missing in .env.local");
    process.exit(1);
  }
  if (env.AI_PROVIDER_DISABLE_ANTHROPIC !== "1" && process.env.AI_PROVIDER_DISABLE_ANTHROPIC !== "1") {
    console.warn("⚠ Set AI_PROVIDER_DISABLE_ANTHROPIC=1 on dev server for strict OpenAI-only test");
  }

  await requireDevServer(base);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    console.error("✗ Missing Supabase URL or service role key");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authCookie(env);
  console.log(`✓ Auth: ${auth.source}`);

  const sessionCheck = await fetch(`${base}/api/dev/auth-session-check`, {
    headers: { Cookie: auth.cookieHeader },
  });
  const sessionBody = await sessionCheck.json().catch(() => ({}));
  const userId = sessionBody.userId ?? auth.userId;
  const userEmail = sessionBody.email ?? auth.email;

  if (!userId) {
    console.error("✗ Could not resolve user id from session");
    process.exit(1);
  }
  console.log(`✓ User: ${userEmail ?? userId}`);

  const { data: profileBefore } = await admin
    .from("profiles")
    .select("credits_remaining, plan_id, credits_limit, monthly_token_limit")
    .eq("id", userId)
    .single();

  const creditsBefore = profileBefore?.credits_remaining ?? null;
  console.log(`✓ Credits before: ${creditsBefore}`);

  const operationId = `smoke-discuss-${Date.now()}`;
  const userText = "What is DreamOS86 in one short sentence?";
  const sendStarted = performance.now();

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      Cookie: auth.cookieHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "discuss",
      modelId: "gpt-4o-mini",
      operationId,
      idempotencyKey: operationId,
      messages: [
        {
          id: `user-${operationId}`,
          role: "user",
          parts: [{ type: "text", text: userText }],
        },
      ],
    }),
  });

  const provider = res.headers.get("X-DreamOS-Provider") ?? "";
  const model = res.headers.get("X-DreamOS-Model") ?? "";
  const creditsEst = res.headers.get("X-DreamOS-Credits-Estimate") ?? "";

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`✗ Chat failed HTTP ${res.status}`, errBody.slice(0, 500));
    process.exit(1);
  }

  const streamRaw = await res.text();
  const assistantText = parseStreamText(streamRaw);
  const streamMs = Math.round(performance.now() - sendStarted);

  console.log(`✓ HTTP ${res.status} in ${streamMs}ms`);
  console.log(`  Provider header: ${provider || "(none)"}`);
  console.log(`  Model header: ${model || "(none)"}`);
  console.log(`  Credits estimate header: ${creditsEst || "(none)"}`);

  if (!assistantText || assistantText.length < 8) {
    console.error("✗ Assistant response empty or too short");
    console.error("  Stream preview:", streamRaw.slice(0, 300));
    process.exit(1);
  }
  console.log(`✓ Assistant (${assistantText.length} chars): ${assistantText.slice(0, 120)}…`);

  if (provider && provider !== "openai") {
    console.error(`✗ Expected OpenAI provider, got: ${provider}`);
    process.exit(1);
  }
  if (model && !/gpt/i.test(model)) {
    console.error(`✗ Expected GPT model, got: ${model}`);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 1500));

  const { data: profileAfter } = await admin
    .from("profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .single();
  const creditsAfter = profileAfter?.credits_remaining ?? null;
  const charged = creditsBefore != null && creditsAfter != null ? creditsBefore - creditsAfter : null;
  console.log(`✓ Credits after: ${creditsAfter} (delta: ${charged})`);

  const { data: usageRows } = await admin
    .from("ai_usage_logs")
    .select("*")
    .eq("operation_id", operationId)
    .order("created_at", { ascending: false })
    .limit(3);

  const usage = usageRows?.[0];
  if (!usage) {
    console.error("✗ No ai_usage_logs row for operation", operationId);
    process.exit(1);
  }
  console.log(`✓ ai_usage_logs: status=${usage.status} model=${usage.model_id} charged=${usage.tokens_charged ?? usage.credits_charged ?? 0}`);

  const { data: creditEvents } = await admin
    .from("credit_events")
    .select("event_type, amount, credits_consumed, operation_id, model_id")
    .eq("operation_id", operationId)
    .limit(5);

  if (creditEvents?.length) {
    console.log(`✓ credit_events: ${creditEvents.length} row(s)`);
  } else {
    console.warn("⚠ No credit_events row (charge_tokens path may use different operation_id format)");
  }

  const creditsApi = await fetch(`${base}/api/credits`, {
    headers: { Cookie: auth.cookieHeader },
  });
  const creditsJson = await creditsApi.json().catch(() => ({}));
  const apiAvailable = creditsJson.available ?? creditsJson.credits_remaining ?? creditsJson.tokens_remaining;
  console.log(`✓ /api/credits available: ${apiAvailable}`);

  if (creditsAfter != null && apiAvailable != null && Math.abs(creditsAfter - apiAvailable) > 0.01) {
    console.warn(`⚠ Profile vs /api/credits mismatch: ${creditsAfter} vs ${apiAvailable}`);
  } else {
    console.log("✓ Profile and /api/credits synced");
  }

  const { data: msgs } = await admin
    .from("messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(4);

  const savedUser = msgs?.find((m) => m.role === "user" && String(m.content).includes("DreamOS86"));
  const savedAsst = msgs?.find((m) => m.role === "assistant");
  if (savedUser) console.log("✓ User message persisted");
  else console.warn("⚠ User message not found in recent messages (may use different storage)");

  if (savedAsst) console.log("✓ Assistant message persisted");

  const forbidden = ["provider cost", "margin", "anthropic budget", "service role", "charge_tokens"];
  const leak = forbidden.filter((p) => assistantText.toLowerCase().includes(p));
  if (leak.length) console.warn("⚠ Unexpected phrases in assistant text:", leak.join(", "));
  else console.log("✓ No internal economics leaked in assistant reply");

  const tokensIn = usage.tokens_input ?? 0;
  const tokensOut = usage.tokens_output ?? 0;
  const estCostUsd =
    tokensIn && tokensOut
      ? (tokensIn * 0.15) / 1_000_000 + (tokensOut * 0.6) / 1_000_000
      : null;

  console.log("\n--- Summary ---");
  console.log(`Operation: ${operationId}`);
  console.log(`Stream latency: ${streamMs}ms`);
  console.log(`Credits charged (profile delta): ${charged ?? "unknown"}`);
  console.log(`Usage log tokens: in=${tokensIn} out=${tokensOut}`);
  if (estCostUsd != null) {
    console.log(`Estimated OpenAI cost (gpt-4o-mini list rates): ~$${estCostUsd.toFixed(6)} USD`);
  } else {
    console.log("Estimated OpenAI cost: ~$0.0001–0.0003 USD (typical discuss micro-turn)");
  }
  console.log("\n✓ smoke:openai-discuss PASSED\n");
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
