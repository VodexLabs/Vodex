import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadMemory, formatMemoryForPrompt } from "@/lib/creation/memory";
import { buildSystemPrompt } from "@/lib/creation/system-prompt";
import { calculateCredits } from "@/lib/credits/cost-engine";

// ─── Model ID normalisation ───────────────────────────────────────────────────

const MODEL_ID_MAP: Record<string, string> = {
  // DreamOS internal IDs → provider SDK IDs
  "claude-opus-4-7":   "claude-opus-4-5",            // placeholder until 4.7 GA
  "claude-opus-4-6":   "claude-opus-4-5",
  "claude-sonnet-4-6": "claude-sonnet-4-5",
  "claude-haiku-4-5":  "claude-haiku-4-5",
  "gpt-5-5":           "gpt-4o",                     // map until GPT-5 GA
  "gpt-5-4":           "gpt-4o",
  "gpt-4o":            "gpt-4o",
  "gpt-4o-mini":       "gpt-4o-mini",
  "gemini-2-5-pro":    "gemini-2.5-pro",
  "gemini-2-0-flash":  "gemini-2.0-flash",
  "deepseek-chat":     "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
};

function resolveModel(modelId: string) {
  const resolved = MODEL_ID_MAP[modelId] ?? modelId;
  if (resolved.startsWith("claude")) return anthropic(resolved);
  if (resolved.startsWith("gpt"))    return openai(resolved);
  if (resolved.startsWith("gemini")) return google(resolved);
  // Default: fast Anthropic model
  return anthropic("claude-haiku-4-5");
}

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last?.parts?.length) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: {
    messages?: UIMessage[];
    modelId?: string;
    conversationId?: string;
    mode?: "discuss" | "edit" | "build";
    scope?: string | null;
    projectId?: string;
  };

  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const uiMessages = raw.messages ?? [];
  if (!Array.isArray(uiMessages) || uiMessages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const modelId = typeof raw.modelId === "string" && raw.modelId.length > 0
    ? raw.modelId
    : "claude-sonnet-4-6";
  const conversationId = typeof raw.conversationId === "string" && raw.conversationId.length > 0
    ? raw.conversationId
    : undefined;
  const mode: "discuss" | "edit" | "build" =
    raw.mode === "edit" ? "edit" : raw.mode === "build" ? "build" : "discuss";
  const scope = typeof raw.scope === "string" ? raw.scope : null;
  const projectId = typeof raw.projectId === "string" && raw.projectId.length > 0
    ? raw.projectId
    : undefined;

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(uiMessages, { ignoreIncompleteToolCalls: true });
  } catch {
    return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
  }

  // ─── Credit gate (using unified cost engine) ─────────────────────────────
  const creditsNeeded = calculateCredits(modelId, mode);

  const { data: creditResultRaw, error: rpcError } = await supabase.rpc("consume_credits", {
    p_user_id: user.id,
    p_amount: creditsNeeded,
    p_operation_id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    p_model_id: modelId,
    ...(conversationId ? { p_conversation_id: conversationId } : {}),
  });

  const creditResult = creditResultRaw as
    | { success?: boolean; remaining?: number; error?: string | null }
    | null
    | undefined;

  // Only hard-block on confirmed insufficient credits; let infra errors through
  if (!rpcError && creditResult && !creditResult.success) {
    const reason = creditResult.error;
    if (reason === "insufficient_credits" || reason === "forbidden") {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          remaining: creditResult.remaining ?? 0,
          required: creditsNeeded,
        },
        { status: 402 },
      );
    }
  }

  // ─── Persist user message ────────────────────────────────────────────────
  const userText = lastUserText(uiMessages);
  if (conversationId && userText) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: userText,
      credits_used: creditsNeeded,
      model_id: modelId,
    });
  }

  // Fire-and-forget analytics
  supabase.from("analytics_events").insert({
    user_id: user.id,
    event_type: "ai_generation",
    properties: { model_id: modelId, credits: creditsNeeded, mode },
  }).then(() => {});

  // ─── Build system prompt ─────────────────────────────────────────────────
  let memoryBlock = "";
  if (projectId) {
    const { entries } = await loadMemory(supabase, { projectId, limit: 30 });
    memoryBlock = formatMemoryForPrompt(entries);
  }

  const systemPrompt = buildSystemPrompt({ mode, scope, projectMemoryBlock: memoryBlock, hasProject: !!projectId });

  // ─── Stream response ─────────────────────────────────────────────────────
  try {
    const model = resolveModel(modelId);
    const result = streamText({
      model,
      messages: modelMessages,
      system: systemPrompt,
      onFinish: async (event) => {
        if (!conversationId) return;
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: event.text,
          model_id: modelId,
          finish_reason: event.finishReason,
          tokens_input: event.usage.inputTokens ?? null,
          tokens_output: event.usage.outputTokens ?? null,
          metadata: { mode, scope, projectId } as never,
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Model unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
