/**
 * Load admin smoke routing recommendations from the latest smoke report file.
 */
import fs from "node:fs";
import path from "node:path";
import {
  SMOKE_REPORT_FILENAME,
  type CombinedModelSmokeReport,
  type ModelSmokeRoutingNotes,
} from "@/lib/ai/model-smoke-test";

/** Defaults when no smoke report exists — overridden by loadSmokeRoutingConfig(). */
export const DEFAULT_SMOKE_ROUTING = {
  cheapestDiscuss: "gemini-flash",
  bestPlanner: "gpt-5-4-mini",
  bestHeavy: "claude-opus-4-7",
  bestEdit: "gpt-5-4-mini",
  fallbackWhenClaudeUnavailable: "gpt-5-4",
  fallbackWhenOpenAiUnavailable: "gemini-flash",
  fallbackWhenGeminiUnavailable: "gpt-5-4-mini",
} as const;

export type SmokeRoutingConfig = {
  cheapestDiscuss: string;
  bestPlanner: string;
  bestHeavy: string;
  bestEdit: string;
  fallbackWhenClaudeUnavailable: string;
  fallbackWhenOpenAiUnavailable: string;
  fallbackWhenGeminiUnavailable: string;
};

let cached: SmokeRoutingConfig | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

function fromNotes(notes: ModelSmokeRoutingNotes): SmokeRoutingConfig {
  return {
    cheapestDiscuss: notes.cheapestReliableDiscuss ?? DEFAULT_SMOKE_ROUTING.cheapestDiscuss,
    bestPlanner: notes.bestPlanning ?? DEFAULT_SMOKE_ROUTING.bestPlanner,
    bestHeavy: notes.bestHeavyImplementation ?? DEFAULT_SMOKE_ROUTING.bestHeavy,
    bestEdit: notes.bestEdit ?? DEFAULT_SMOKE_ROUTING.bestEdit,
    fallbackWhenClaudeUnavailable:
      notes.fallbackWhenClaudeUnavailable ?? DEFAULT_SMOKE_ROUTING.fallbackWhenClaudeUnavailable,
    fallbackWhenOpenAiUnavailable:
      notes.fallbackWhenOpenAiUnavailable ?? DEFAULT_SMOKE_ROUTING.fallbackWhenOpenAiUnavailable,
    fallbackWhenGeminiUnavailable:
      notes.fallbackWhenGeminiUnavailable ?? DEFAULT_SMOKE_ROUTING.fallbackWhenGeminiUnavailable,
  };
}

export function loadSmokeRoutingConfig(force = false): SmokeRoutingConfig {
  const now = Date.now();
  if (!force && cached && now - cachedAt < TTL_MS) return cached;

  const reportPath = path.join(process.cwd(), SMOKE_REPORT_FILENAME);
  if (!fs.existsSync(reportPath)) {
    cached = { ...DEFAULT_SMOKE_ROUTING };
    cachedAt = now;
    return cached;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as CombinedModelSmokeReport;
    if (report.routingNotes) {
      cached = fromNotes(report.routingNotes);
      cachedAt = now;
      return cached;
    }
  } catch {
    /* fall through */
  }

  cached = { ...DEFAULT_SMOKE_ROUTING };
  cachedAt = now;
  return cached;
}

export function loadSmokeRoutingNotes(): ModelSmokeRoutingNotes | null {
  const reportPath = path.join(process.cwd(), SMOKE_REPORT_FILENAME);
  if (!fs.existsSync(reportPath)) return null;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as CombinedModelSmokeReport;
    return report.routingNotes ?? null;
  } catch {
    return null;
  }
}
