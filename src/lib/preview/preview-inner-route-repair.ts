import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PREVIEW_ARTIFACTS_BUCKET,
  downloadPreviewArtifactFile,
} from "@/lib/imports/preview-artifact-storage";
import {
  assertPreviewBootstrapClean,
  countHydrationPathLeaks,
  sanitizePreviewBootstrapState,
  scanBootstrapLeaksDetailed,
} from "@/lib/preview/preview-bootstrap-sanitizer";
import { rewritePreviewArtifactHtml } from "@/lib/preview/rewrite-preview-artifact-html";
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

export async function verifyStoredArtifactBootstrapClean(input: {
  admin: SupabaseClient;
  projectId: string;
  artifactPath: string;
}): Promise<{
  ok: boolean;
  unsafeCount: number;
  hydrationCount: number;
  servedUnsafeCount: number;
  servedHydrationCount: number;
}> {
  const files = await listArtifactFiles(input.admin, input.artifactPath);
  let unsafeCount = 0;
  let hydrationCount = 0;
  let servedUnsafeCount = 0;
  let servedHydrationCount = 0;
  const buildId = input.artifactPath.split("/").pop() ?? "unknown";

  for (const rel of files) {
    if (!TEXT_ARTIFACT_EXT.test(rel)) continue;
    const file = await downloadPreviewArtifactFile({
      admin: input.admin,
      artifactPath: input.artifactPath,
      relativePath: rel,
    });
    if (!file) continue;
    const text = file.data.toString("utf8");
    unsafeCount += scanBootstrapLeaksDetailed(text, input.projectId, {
      excludePlatformInjections: false,
      file: rel,
    }).length;
    hydrationCount += countHydrationPathLeaks(text, input.projectId, false);

    if (/index\.html?$/i.test(rel)) {
      const served = rewritePreviewArtifactHtml(text, input.projectId, buildId, "/");
      const servedAssert = assertPreviewBootstrapClean(served, input.projectId);
      if (!servedAssert.ok) {
        servedUnsafeCount = servedAssert.leaks.length;
        servedHydrationCount = servedAssert.hydrationCount;
      }
    }
  }

  return {
    ok: unsafeCount === 0 && hydrationCount === 0 && servedUnsafeCount === 0 && servedHydrationCount === 0,
    unsafeCount,
    hydrationCount,
    servedUnsafeCount,
    servedHydrationCount,
  };
}

/**
 * Sanitize stored artifact files, rebuild, and verify zero bootstrap leaks before marking renderable.
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
  verified?: boolean;
  verification?: Awaited<ReturnType<typeof verifyStoredArtifactBootstrapClean>>;
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
    const stripped = sanitizePreviewBootstrapState(text, input.projectId, "/", {
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
  let verification: Awaited<ReturnType<typeof verifyStoredArtifactBootstrapClean>> | undefined;
  let verified = false;

  if (!queued && diagnostics.artifactPath) {
    verification = await verifyStoredArtifactBootstrapClean({
      admin: input.admin,
      projectId: input.projectId,
      artifactPath: diagnostics.artifactPath,
    });
    verified = verification.ok;
  }

  return {
    ok: true,
    sanitizedFiles,
    jobId: jobId ?? undefined,
    queued,
    verified,
    verification,
    message: queued
      ? `Sanitized ${sanitizedFiles} artifact file(s) and queued preview rebuild`
      : verified
        ? `Sanitized ${sanitizedFiles} file(s); rebuild verified clean (0 leaks)`
        : `Sanitized ${sanitizedFiles} file(s); rebuild finished — verification pending or leaks remain`,
  };
}
