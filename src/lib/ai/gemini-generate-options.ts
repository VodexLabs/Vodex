/**
 * Gemini 2.5 models allocate internal "thinking" tokens against maxOutputTokens.
 * Low caps (e.g. smoke tests at 40) can yield empty visible text with finishReason MAX_TOKENS.
 */
export function isGeminiApiModelId(apiModelId: string): boolean {
  return apiModelId.startsWith("gemini");
}

/** Gemini Pro models require a non-zero thinking budget — budget 0 is rejected by the API. */
export function isGeminiThinkingOnlyApiModel(apiModelId: string): boolean {
  return /gemini-.*pro/i.test(apiModelId) && !/flash/i.test(apiModelId);
}

export type GoogleGenerateProviderOptions = {
  google: {
    thinkingConfig: {
      thinkingBudget: number;
    };
  };
};

/** Tune thinking budget so low smoke caps still return visible text. */
export function googleProviderOptionsForApiModel(
  apiModelId: string,
): GoogleGenerateProviderOptions | undefined {
  if (!isGeminiApiModelId(apiModelId)) return undefined;
  if (isGeminiThinkingOnlyApiModel(apiModelId)) {
    return {
      google: {
        thinkingConfig: {
          thinkingBudget: 128,
        },
      },
    };
  }
  return {
    google: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };
}

/** Pro/thinking Gemini models need a higher output cap than flash-only smoke defaults. */
export function googleSmokeMaxOutputTokens(apiModelId: string, defaultCap: number): number {
  if (isGeminiThinkingOnlyApiModel(apiModelId)) return Math.max(defaultCap, 128);
  return defaultCap;
}

export function withGoogleProviderOptions<T extends Record<string, unknown>>(
  apiModelId: string,
  opts: T,
): T & { providerOptions?: GoogleGenerateProviderOptions } {
  const providerOptions = googleProviderOptionsForApiModel(apiModelId);
  if (!providerOptions) return opts;
  return { ...opts, providerOptions };
}

/** Extract visible text from a generateText result (fallback if result.text is empty). */
export function extractGenerateTextContent(result: {
  text?: string | null;
  response?: { messages?: Array<{ role?: string; content?: unknown }> };
}): string {
  if (result.text?.trim()) return result.text.trim();

  const messages = result.response?.messages;
  if (!Array.isArray(messages)) return "";

  const parts: string[] = [];
  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === "string" && content.trim()) {
      parts.push(content.trim());
      continue;
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part && typeof part === "object" && "type" in part && part.type === "text") {
          const t = (part as { text?: string }).text;
          if (t?.trim()) parts.push(t.trim());
        }
      }
    }
  }
  return parts.join("\n").trim();
}

export type GeminiEmptyResponseClassification =
  | { kind: "empty_provider_response"; detail: string }
  | { kind: "response_parser_issue"; detail: string };

/** Classify why Gemini returned no visible text (for admin smoke diagnostics). */
export function classifyGeminiEmptyResponse(input: {
  apiModelId: string;
  finishReason?: string | null;
  usage?: { outputTokens?: number | null; totalTokens?: number | null } | null;
  rawText: string;
}): GeminiEmptyResponseClassification {
  if (input.rawText.trim()) {
    return { kind: "response_parser_issue", detail: "Parser returned empty but raw text exists" };
  }

  const finish = (input.finishReason ?? "").toLowerCase();
  if (finish.includes("max") || finish.includes("length")) {
    return {
      kind: "empty_provider_response",
      detail:
        "Gemini consumed the output token budget on internal thinking before visible text (increase cap or set thinkingBudget: 0)",
    };
  }

  if (isGeminiApiModelId(input.apiModelId)) {
    return {
      kind: "empty_provider_response",
      detail: "Provider returned no visible text parts",
    };
  }

  return { kind: "response_parser_issue", detail: "Could not extract text from model response" };
}
