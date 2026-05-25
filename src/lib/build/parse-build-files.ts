import { parseFencedFiles } from "@/lib/creation/extract-fenced-code";
import { extractBuilderMetadata } from "@/lib/creation/parse-builder-metadata";
import { parseJsonFromModel } from "@/lib/ai/provider-call";
import {
  filterRenderableBuildFiles,
  type BuildFile,
} from "@/lib/build/generated-file-utils";

/** Parse model output into real source files — never treat metadata JSON as the only file. */
export function parseBuildFilesFromModel(text: string): {
  files: BuildFile[];
  events: Array<{ type: string; path: string; summary: string }>;
} {
  const events: Array<{ type: string; path: string; summary: string }> = [];
  const collected: BuildFile[] = [];

  const parsed = parseJsonFromModel<{
    files?: BuildFile[];
    events?: Array<{ type: string; path: string; summary: string }>;
  }>(text);

  if (parsed?.files?.length) {
    for (const f of parsed.files) {
      if (f.path && f.content) collected.push({ path: f.path, content: f.content, language: f.language });
    }
    if (parsed.events?.length) events.push(...parsed.events);
  }

  if (collected.length === 0) {
    const loose = text.match(/\{\s*"files"\s*:\s*\[[\s\S]*?\]\s*[,}]/);
    if (loose) {
      try {
        const wrap = parseJsonFromModel<{ files?: BuildFile[] }>(`{${loose[0]}`);
        if (wrap?.files?.length) {
          for (const f of wrap.files) {
            if (f.path && f.content) collected.push({ path: f.path, content: f.content });
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  for (const f of parseFencedFiles(text)) {
    if (/dreamos-app-meta/i.test(f.path) || /dreamos-app-meta/i.test(f.content)) continue;
    if (f.content.trim().startsWith("{") && f.content.includes('"app"') && !/export\s+/.test(f.content)) {
      continue;
    }
    collected.push({ path: f.path, content: f.content });
  }

  const meta = extractBuilderMetadata(text);
  if (meta?.files?.length && collected.length === 0) {
    for (const ref of meta.files) {
      if (ref.path && typeof ref.path === "string") {
        events.push({
          type: "planned",
          path: ref.path,
          summary: `Planned ${ref.path} (content missing — repair required)`,
        });
      }
    }
  }

  const files = filterRenderableBuildFiles(collected);
  return { files, events };
}
