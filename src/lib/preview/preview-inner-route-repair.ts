import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PREVIEW_ARTIFACTS_BUCKET,
  downloadPreviewArtifactFile,
} from "@/lib/imports/preview-artifact-writer";
import { stripPreviewPlatformPathsFromText } from "@/lib/preview/strip-preview-platform-paths";
import { runProjectPreviewBuild } from "@/lib/imports/run-project-preview-build";
import { TEXT_ARTIFACT_EXT } from "@/lib/preview/preview-path-leak-scanner";

async function listArtifactFiles(
  admin: SupabaseClient,
  artifactPath: string,
): Promise<string[]> {
  const out: string[] = [];
  async function walk(folder: string) {
    const { data, error } = await admin.storage.from(PREVIEW_ARTIFACTS_BUCKET).list(folder, {
      limit: 500,
    });
    if (error || !data) return;
    for (const ent of data) {
      const rel = folder ? `${folder}/${ent.name}` : ent.name;
      if (ent.id == null) await walk(rel);
      else out.push(rel.replace(`${artifactPath}/`, "").replace(/^\/+/, ""));
    }
  }
  await walk(artifactPath);
  return out;
}

function contentTypeFor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html") return "text/html; charset=utf-8";
  if (ext === "js" || ext === "mjs") return "application/javascript; charset=utf-8";
  if (ext === "css") return "text/css; charset=utf-8";
  if (ext === "json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

/**
 * Sanitize stored artifact files, then queue a full preview rebuild so worker re-applies shims.
 */
export async function repairPreviewInnerRoute(input: {
  admin: SupabaseClient;
  writer: SupabaseClient;
  userId: string;
  projectId: string;
  artifactPath: string;
}): Promise<{
  ok: boolean;
  sanitizedFiles: number;
  jobId?: string;
  queued?: boolean;
  message?: string;
  error?: string;
}> {
  const files = await listArtifactFiles(input.admin, input.artifactPath);
  if (!files.length) {
    return { ok: false, sanitizedFiles: 0, error: "No artifact files found in storage" };
  }

  let sanitizedFiles = 0;
  for (const rel of files) {
    if (!TEXT_ARTIFACT_EXT.test(rel)) continue;
    const file = await downloadPreviewArtifactFile({
      admin: input.admin,
      artifactPath: input.artifactPath,
      relativePath: rel,
    });
    if (!file) continue;
    const text = file.data.toString("utf8");
    const isJs = /\.m?js$/i.test(rel);
    const stripped = stripPreviewPlatformPathsFromText(text, input.projectId, {
      rewriteAssetUrls: !isJs,
    });
    if (stripped === text) continue;
    const storagePath = `${input.artifactPath}/${rel}`;
    const { error } = await input.admin.storage
      .from(PREVIEW_ARTIFACTS_BUCKET)
      .upload(storagePath, Buffer.from(stripped, "utf8"), {
        contentType: contentTypeFor(rel),
        upsert: true,
      });
    if (error) {
      return {
        ok: false,
        sanitizedFiles,
        error: `Failed to re-upload ${rel}: ${error.message}`,
      };
    }
    sanitizedFiles += 1;
  }

  const { diagnostics, jobId } = await runProjectPreviewBuild({
    admin: input.admin,
    writer: input.writer,
    userId: input.userId,
    projectId: input.projectId,
  });

  const queued = diagnostics.previewStatus === "queued";
  return {
    ok: true,
    sanitizedFiles,
    jobId: jobId ?? undefined,
    queued,
    message: queued
      ? `Sanitized ${sanitizedFiles} artifact file(s) and queued preview rebuild`
      : `Sanitized ${sanitizedFiles} artifact file(s); preview rebuild finished`,
  };
}
