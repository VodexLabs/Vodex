import { googleGenerativeApiKey } from "@/lib/llm/env-keys";

/** Live Gemini API model IDs — override via env when Google rotates model names. */
export function googleFlashApiModelId(): string {
  return (
    process.env.GOOGLE_GEMINI_FLASH_MODEL?.trim() ||
    process.env.GEMINI_FLASH_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

export function googleProApiModelId(): string {
  return (
    process.env.GOOGLE_GEMINI_PRO_MODEL?.trim() ||
    process.env.GEMINI_PRO_MODEL?.trim() ||
    "gemini-2.5-pro"
  );
}

export function isDeprecatedGeminiApiModel(apiModelId: string): boolean {
  return apiModelId === "gemini-2.0-flash" || apiModelId === "gemini-1.5-flash";
}

/** Resolve catalog Gemini entry to a live API model ID. */
export function resolveGoogleCatalogApiModel(catalogId: string): string {
  const id = catalogId.toLowerCase();
  if (id.includes("flash") && !id.includes("2-5-pro") && !id.includes("3")) {
    return googleFlashApiModelId();
  }
  if (id.includes("pro") || id.includes("3-1") || id.includes("2-5-pro")) {
    return googleProApiModelId();
  }
  return googleFlashApiModelId();
}

export async function probeGoogleModelAvailable(apiModelId: string): Promise<{
  ok: boolean;
  reason?: string;
  adminNote?: string;
}> {
  const key = googleGenerativeApiKey();
  if (!key) {
    return { ok: false, reason: "missing_api_key", adminNote: "Set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY" };
  }
  if (isDeprecatedGeminiApiModel(apiModelId)) {
    return {
      ok: false,
      reason: "deprecated_model_mapping",
      adminNote: `Mapping uses deprecated ${apiModelId}. Update API_MODEL_MAP or set GOOGLE_GEMINI_FLASH_MODEL / GOOGLE_GEMINI_PRO_MODEL`,
    };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(apiModelId)}?key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = body.error?.message ?? `HTTP ${res.status}`;
    if (/no longer available|not found|404/i.test(msg)) {
      return {
        ok: false,
        reason: "deprecated_model_mapping",
        adminNote: `Gemini model ${apiModelId} unavailable: ${msg}`,
      };
    }
    return { ok: false, reason: "provider_unavailable", adminNote: msg };
  } catch (e) {
    return {
      ok: false,
      reason: "provider_unavailable",
      adminNote: e instanceof Error ? e.message : String(e),
    };
  }
}
