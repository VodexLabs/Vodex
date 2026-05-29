import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { filterRenderableBuildFiles, type BuildFile } from "@/lib/build/generated-file-utils";
import { countComponentFiles } from "@/lib/build/import-graph";

type Writer = SupabaseClient<Database>;

export type FilesPersistTrace = {
  operationId?: string;
  executionInstanceId?: string;
  projectId: string;
  ownerId: string;
  before: {
    generatedCount: number;
    routeCount: number;
    componentCount: number;
    totalBytes: number;
    samplePaths: string[];
  };
  upsert: {
    ok: boolean;
    error?: string;
    rowCount: number;
  };
  after: {
    serviceRoleCount: number;
    generatedSourceCount: number;
    visibleCount: number;
  };
  code?: string;
};

const TRACE_PATH = path.join(process.cwd(), "files_persistence_snapshot.json");

export function logPersistTrace(stage: string, trace: Partial<FilesPersistTrace>): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[files-persist-trace] ${stage}`, trace);
}

export function writeFilesPersistSnapshot(trace: FilesPersistTrace): void {
  try {
    fs.writeFileSync(TRACE_PATH, JSON.stringify(trace, null, 2));
  } catch {
    /* non-fatal */
  }
}

export async function tracePersistGeneratedFiles(input: {
  writer: Writer;
  projectId: string;
  ownerId: string;
  files: BuildFile[];
  operationId?: string;
  executionInstanceId?: string;
}): Promise<{ trace: FilesPersistTrace; result: import("@/lib/build/persist-generated-files").PersistBuildFilesResult }> {
  const { persistGeneratedBuildFiles } = await import("@/lib/build/persist-generated-files");

  const renderable = filterRenderableBuildFiles(input.files);
  const trace: FilesPersistTrace = {
    operationId: input.operationId,
    executionInstanceId: input.executionInstanceId,
    projectId: input.projectId,
    ownerId: input.ownerId,
    before: {
      generatedCount: renderable.length,
      routeCount: renderable.filter((f) => /page\.(tsx|jsx)$/i.test(f.path)).length,
      componentCount: countComponentFiles(renderable),
      totalBytes: renderable.reduce((s, f) => s + Buffer.byteLength(f.content, "utf8"), 0),
      samplePaths: renderable.slice(0, 10).map((f) => f.path),
    },
    upsert: { ok: false, rowCount: 0 },
    after: { serviceRoleCount: 0, generatedSourceCount: 0, visibleCount: 0 },
  };

  logPersistTrace("before", trace);

  const result = await persistGeneratedBuildFiles({
    writer: input.writer,
    projectId: input.projectId,
    ownerId: input.ownerId,
    files: input.files,
    operationId: input.operationId,
    executionInstanceId: input.executionInstanceId,
  });

  trace.upsert = {
    ok: result.ok,
    error: result.error,
    rowCount: result.savedCount,
  };

  const admin = createServiceRoleClient() ?? input.writer;
  const { count: allCount } = await admin
    .from("app_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId);

  const { count: genCount } = await admin
    .from("app_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId)
    .eq("source", "generated");

  trace.after = {
    serviceRoleCount: allCount ?? 0,
    generatedSourceCount: genCount ?? 0,
    visibleCount: result.savedCount,
  };

  if (!result.ok) {
    if (result.error?.includes("permission")) trace.code = "insert_failed";
    else if (result.savedCount === 0 && renderable.length > 0) trace.code = "read_after_write_failed";
    else trace.code = "insert_failed";
  }

  logPersistTrace("after", trace);
  writeFilesPersistSnapshot(trace);
  return { trace, result };
}
