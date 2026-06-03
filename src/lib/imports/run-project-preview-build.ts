import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProjectFilesWithContent } from "@/lib/preview/project-preview-html";
import { runImportPreviewBuild } from "@/lib/imports/runtime-build-runner";
import { applyPreviewBuildToProject } from "@/lib/imports/apply-preview-build-to-project";

export async function runProjectPreviewBuild(input: {
  admin: SupabaseClient;
  writer: SupabaseClient;
  userId: string;
  projectId: string;
}) {
  const files = await loadProjectFilesWithContent(input.writer, input.projectId);
  const zipFiles = files.map((f) => ({
    path: f.path,
    content: f.content,
    sizeBytes: Buffer.byteLength(f.content, "utf8"),
  }));
  const { diagnostics, jobId } = await runImportPreviewBuild({
    admin: input.admin,
    userId: input.userId,
    projectId: input.projectId,
    files: zipFiles,
  });
  await applyPreviewBuildToProject({
    writer: input.writer,
    projectId: input.projectId,
    userId: input.userId,
    diagnostics,
  });
  return { diagnostics, jobId };
}
