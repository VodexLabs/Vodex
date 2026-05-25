import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  filterRenderableBuildFiles,
  isHiddenGeneratedPath,
  type BuildFile,
} from "@/lib/build/generated-file-utils";
import { MIN_RENDERABLE_FILES } from "@/lib/build/build-success-contract";

type Writer = SupabaseClient<Database>;

export type PersistBuildFilesResult = {
  ok: boolean;
  savedCount: number;
  renderableCount: number;
  error?: string;
};

/** Upsert only real source files; never metadata snippets. */
export async function persistGeneratedBuildFiles(input: {
  writer: Writer;
  projectId: string;
  ownerId: string;
  files: BuildFile[];
  source?: string;
}): Promise<PersistBuildFilesResult> {
  const renderable = filterRenderableBuildFiles(input.files);
  if (renderable.length === 0) {
    return { ok: false, savedCount: 0, renderableCount: 0, error: "no_renderable_files" };
  }

  const rows = renderable.map((f) => ({
    project_id: input.projectId,
    owner_id: input.ownerId,
    path: f.path,
    content: f.content,
    language: f.language ?? f.path.split(".").pop() ?? "text",
    mime_type: f.path.endsWith(".json") ? "application/json" : "text/plain",
    size_bytes: Buffer.byteLength(f.content, "utf8"),
    source: input.source ?? "generated",
    metadata: { kind: "source" } as never,
  }));

  const { error: afErr } = await input.writer.from("app_files").upsert(rows as never, {
    onConflict: "project_id,path",
  });

  if (afErr) {
    return {
      ok: false,
      savedCount: 0,
      renderableCount: renderable.length,
      error: afErr.message,
    };
  }

  const { count } = await input.writer
    .from("app_files")
    .select("path", { count: "exact", head: true })
    .eq("project_id", input.projectId);

  const { data: paths } = await input.writer
    .from("app_files")
    .select("path")
    .eq("project_id", input.projectId)
    .limit(200);

  const visibleCount =
    paths?.filter((p) => p.path && !isHiddenGeneratedPath(p.path)).length ?? count ?? renderable.length;

  return {
    ok: visibleCount >= MIN_RENDERABLE_FILES,
    savedCount: visibleCount,
    renderableCount: renderable.length,
  };
}
