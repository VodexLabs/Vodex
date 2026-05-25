/**
 * Chunked cheap intake — split huge prompts, summarize each chunk with cheap planner only,
 * merge into one master execution brief (max 3k tokens for heavy model).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { callProviderStructured, parseJsonFromModel } from "@/lib/ai/provider-call";
import type { BuildIntakeSummary } from "@/lib/ai/build-intake-types";
import {
  CHUNK_INTAKE_MAX_CHARS,
  CHUNK_INTAKE_OVERLAP_CHARS,
  requiresChunkedIntake,
} from "@/lib/ai/prompt-compression-policy";

const CHUNK_JSON_SCHEMA = `Return strict JSON:
{
  "app_purpose": "string",
  "target_users": "string",
  "core_screens": ["string"],
  "visual_style": "string",
  "main_data_entities": ["string"],
  "must_have_first_version": ["string"],
  "nice_to_have_later": ["string"],
  "complex_backend_requirements": ["string"],
  "unresolved_questions": ["string"],
  "estimated_complexity": 1-10
}`;

export function splitPromptIntoChunks(rawPrompt: string): string[] {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return [];
  if (trimmed.length <= CHUNK_INTAKE_MAX_CHARS) return [trimmed];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const end = Math.min(start + CHUNK_INTAKE_MAX_CHARS, trimmed.length);
    chunks.push(trimmed.slice(start, end));
    if (end >= trimmed.length) break;
    start = Math.max(0, end - CHUNK_INTAKE_OVERLAP_CHARS);
  }
  return chunks;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function rankTaskValue(task: string): number {
  let score = 0;
  if (/\b(dashboard|home|landing|main|shell|navigation|layout)\b/i.test(task)) score += 8;
  if (/\b(screen|page|view|ui|design|preview|demo)\b/i.test(task)) score += 6;
  if (/\b(list|table|card|form|flow|workflow)\b/i.test(task)) score += 4;
  if (/\b(auth|payment|stripe|admin|webhook|integration|analytics)\b/i.test(task)) score -= 5;
  return score;
}

function rankTasks(tasks: string[]): string[] {
  return [...tasks].sort((a, b) => rankTaskValue(b) - rankTaskValue(a));
}

function parseChunkJson(text: string): Partial<BuildIntakeSummary> | null {
  const parsed = parseJsonFromModel<{
    app_purpose?: string;
    target_users?: string;
    core_screens?: string[];
    visual_style?: string;
    main_data_entities?: string[];
    must_have_first_version?: string[];
    nice_to_have_later?: string[];
    complex_backend_requirements?: string[];
    unresolved_questions?: string[];
    estimated_complexity?: number;
  }>(text);
  if (!parsed) return null;
  return {
    appPurpose: parsed.app_purpose,
    targetUsers: parsed.target_users,
    coreScreens: parsed.core_screens,
    visualStyle: parsed.visual_style,
    mainDataEntities: parsed.main_data_entities,
    mustHaveFirstVersionFeatures: parsed.must_have_first_version,
    niceToHaveLaterFeatures: parsed.nice_to_have_later,
    complexBackendRequirements: parsed.complex_backend_requirements,
    unresolvedQuestions: parsed.unresolved_questions,
    estimatedComplexity: parsed.estimated_complexity,
  };
}

function deterministicChunkSummary(chunk: string, chunkIndex: number, total: number): Partial<BuildIntakeSummary> {
  const lines = chunk
    .split(/\n|[;,]/)
    .map((l) => l.replace(/^[\d\-*•.]+\s*/, "").trim())
    .filter((l) => l.length > 8 && l.length < 200);

  return {
    appPurpose: lines[0]?.slice(0, 120) ?? `Chunk ${chunkIndex + 1}/${total} feature set`,
    coreScreens: lines.filter((l) => /\b(page|screen|view|dashboard)\b/i.test(l)).slice(0, 6),
    mustHaveFirstVersionFeatures: lines.slice(0, 20),
    niceToHaveLaterFeatures: lines.slice(20, 40),
    complexBackendRequirements: lines.filter((l) =>
      /\b(auth|payment|api|integration|webhook|database)\b/i.test(l),
    ),
    estimatedComplexity: Math.min(10, 3 + Math.floor(lines.length / 15)),
  };
}

/** Merge chunk summaries into one master intake summary. */
export function mergeChunkSummaries(
  summaries: Partial<BuildIntakeSummary>[],
  promptTokenEstimate: number,
): BuildIntakeSummary {
  const purposes = summaries.map((s) => s.appPurpose).filter(Boolean) as string[];
  const mustHave = rankTasks(
    dedupeStrings(summaries.flatMap((s) => s.mustHaveFirstVersionFeatures ?? [])),
  );
  const niceToHave = dedupeStrings(summaries.flatMap((s) => s.niceToHaveLaterFeatures ?? []));
  const screens = dedupeStrings(summaries.flatMap((s) => s.coreScreens ?? [])).slice(0, 12);
  const entities = dedupeStrings(summaries.flatMap((s) => s.mainDataEntities ?? [])).slice(0, 10);
  const integrations = dedupeStrings(summaries.flatMap((s) => s.complexBackendRequirements ?? []));
  const questions = dedupeStrings(summaries.flatMap((s) => s.unresolvedQuestions ?? [])).slice(0, 6);
  const complexity = Math.min(
    10,
    Math.max(1, ...summaries.map((s) => s.estimatedComplexity ?? 4)),
  );

  return {
    appPurpose: purposes[0]?.slice(0, 160) ?? "Multi-feature application",
    targetUsers:
      summaries.find((s) => s.targetUsers)?.targetUsers ?? "General users",
    coreScreens: screens.length ? screens : mustHave.slice(0, 5).map((f) => f.slice(0, 60)),
    visualStyle:
      summaries.find((s) => s.visualStyle)?.visualStyle ??
      "Modern, polished UI with consistent design system",
    mainDataEntities: entities.length ? entities : ["Core records"],
    mustHaveFirstVersionFeatures: mustHave,
    niceToHaveLaterFeatures: niceToHave,
    complexBackendRequirements: integrations,
    unresolvedQuestions: questions,
    estimatedComplexity: complexity,
    promptTokenEstimate,
    compressedTokenEstimate: 0,
  };
}

export async function processChunkedHugePromptIntake(input: {
  writer?: SupabaseClient<Database>;
  userId: string;
  userEmail?: string | null;
  operationId: string;
  rawPrompt: string;
  userSelectedModelId?: string | null;
  fallbackSummary: BuildIntakeSummary;
}): Promise<{ summary: BuildIntakeSummary; usedCheapModel: boolean; helperModelId?: string; costUsd: number }> {
  if (!requiresChunkedIntake(input.rawPrompt)) {
    return {
      summary: input.fallbackSummary,
      usedCheapModel: false,
      costUsd: 0,
    };
  }

  const chunks = splitPromptIntoChunks(input.rawPrompt);
  const partials: Partial<BuildIntakeSummary>[] = [];
  let usedCheapModel = false;
  let helperModelId: string | undefined;
  let costUsd = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    let partial: Partial<BuildIntakeSummary> = deterministicChunkSummary(chunk, i, chunks.length);

    if (input.writer) {
      try {
        const res = await callProviderStructured({
          writer: input.writer,
          userId: input.userId,
          userEmail: input.userEmail,
          operationId: `${input.operationId}:chunk:${i}`,
          operationType: "build_intake",
          system: "You extract structured app requirements from a chunk of a large spec. Cheap planner only. JSON only.",
          prompt: `Chunk ${i + 1}/${chunks.length}. Summarize features/tasks from this section and ${CHUNK_JSON_SCHEMA}\n\n---\n${chunk}\n---`,
          userSelectedModelId: input.userSelectedModelId,
        });
        usedCheapModel = true;
        helperModelId = res.spec.modelId;
        costUsd += res.providerCostUsd;
        partial = parseChunkJson(res.text) ?? partial;
      } catch {
        /* deterministic partial */
      }
    }

    partials.push(partial);
  }

  const merged = mergeChunkSummaries(partials, input.fallbackSummary.promptTokenEstimate);
  return { summary: merged, usedCheapModel, helperModelId, costUsd };
}
