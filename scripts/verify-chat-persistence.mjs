#!/usr/bin/env node
/**
 * P1.3.32 — Chat persistence validation (static + live DB round-trip).
 * Simulates: create conversation → refresh → close/reopen builder (re-fetch by project_id).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAdmin,
  resolveValidationUserId,
  DEFAULT_PREVIEW_PROJECT_ID,
  arg,
  pass,
  fail,
} from "./lib/production-validation.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustInclude(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(`${rel}: ${label}`);
}

mustInclude("src/components/chat/chat-view.tsx", "switchConversation", "conversation switch");
mustInclude("src/components/chat/chat-view.tsx", "updateChatUrl", "URL sync");
mustInclude("src/app/api/conversations/route.ts", "conversations", "conversations API");
mustInclude("src/lib/projects/project-conversation.ts", "findProjectConversationId", "project conversation lookup");
mustInclude("src/app/api/chat/route.ts", "ensureProjectConversation", "chat ensures conversation");

async function livePersistenceRoundTrip(admin, userId, projectId) {
  const marker = `verify-p1332-${Date.now()}`;
  const title = `P1332 persistence ${marker}`;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .insert({
      user_id: userId,
      project_id: projectId,
      title,
      model_id: "gpt-4o-mini",
      mode: "discuss",
    })
    .select("id")
    .single();
  if (convErr || !conv?.id) throw new Error(convErr?.message ?? "conversation insert failed");
  const conversationId = conv.id;

  const userContent = `User message ${marker}`;
  const assistantContent = `Assistant reply ${marker}`;

  const { error: msgErr } = await admin.from("messages").insert([
    { conversation_id: conversationId, user_id: userId, role: "user", content: userContent },
    { conversation_id: conversationId, user_id: userId, role: "assistant", content: assistantContent },
  ]);
  if (msgErr) throw new Error(`messages insert: ${msgErr.message}`);

  // Simulate page refresh — re-fetch conversation list for project
  const { data: afterRefresh, error: refreshErr } = await admin
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("id", conversationId)
    .maybeSingle();
  if (refreshErr || !afterRefresh?.id) {
    throw new Error(refreshErr?.message ?? "conversation missing after refresh simulation");
  }

  // Simulate close/reopen builder — findProjectConversationId equivalent
  const { data: reopened } = await admin
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reopened?.id !== conversationId) {
    throw new Error(`reopen lookup got ${reopened?.id ?? "null"}, expected ${conversationId}`);
  }

  const { data: messages, error: listErr } = await admin
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (listErr) throw new Error(`messages list: ${listErr.message}`);
  if ((messages?.length ?? 0) < 2) {
    throw new Error(`expected ≥2 messages, got ${messages?.length ?? 0}`);
  }
  const bodies = (messages ?? []).map((m) => m.content).join("\n");
  if (!bodies.includes(marker)) {
    throw new Error("message content lost after round-trip");
  }

  await admin.from("messages").delete().eq("conversation_id", conversationId);
  await admin.from("conversations").delete().eq("id", conversationId);

  return { conversationId, messageCount: messages?.length ?? 0 };
}

async function main() {
  console.log("\n=== verify:chat-persistence ===\n");
  ok.forEach((m) => pass(m));

  let admin;
  try {
    admin = createAdmin();
  } catch (err) {
    errors.push(`admin: ${err.message}`);
  }

  if (admin) {
    const projectId = arg("--project", DEFAULT_PREVIEW_PROJECT_ID);
    const userId = await resolveValidationUserId(admin, projectId);
    if (!userId) {
      errors.push("set E2E_TEST_EMAIL, PRODUCTION_VALIDATION_USER_ID, or --project owner for live test");
    } else {
      try {
        const result = await livePersistenceRoundTrip(admin, userId, projectId);
        pass(
          `live round-trip: conv ${result.conversationId} retained ${result.messageCount} messages after refresh/reopen`,
        );
      } catch (err) {
        errors.push(`live persistence: ${err.message}`);
      }
    }
  }

  errors.forEach((m) => fail("chat-persistence", m));
  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed/i.test(msg)) {
    fail("remote DB", "unreachable");
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
