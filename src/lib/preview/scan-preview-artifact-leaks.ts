/**
 * P1.3.38 — Scan every stored + served text artifact for stale preview-html route leaks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PREVIEW_ARTIFACTS_BUCKET } from "@/lib/imports/preview-artifact-storage";
import { downloadPreviewArtifactFile } from "@/lib/imports/preview-artifact-storage";
import { rewritePreviewArtifactHtml } from "@/lib/preview/rewrite-preview-artifact-html";
import {
  scanBootstrapLeaksDetailed,
  type DetailedBootstrapLeak,
} from "@/lib/preview/preview-bootstrap-sanitizer";
import {
  PREVIEW_TEXT_ASSET_EXT,
  sanitizeServedPreviewAssetText,
} from "@/lib/preview/serve-preview-artifact-asset";
import { TEXT_ARTIFACT_EXT } from "@/lib/preview/preview-path-leak-scanner";

export type PreviewAssetLeakHit = DetailedBootstrapLeak & {
  file: string;
  phase: "stored" | "served";
};

export type PreviewAssetLeakScanReport = {
  project_id: string;
  artifact_path: string | null;
  artifact_id: string | null;
  files_scanned: number;
  stored_leak_count: number;
  served_leak_count: number;
  hits: PreviewAssetLeakHit[];
};

async function listArtifactFiles(admin: SupabaseClient, artifactPath: string): Promise<string[]> {
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

function artifactIdFromPath(artifactPath: string | null, projectId: string): string | null {
  if (!artifactPath) return null;
  const parts = artifactPath.split("/").filter(Boolean);
  if (parts[0] === projectId && parts[1]) return parts[1];
  return parts[parts.length - 1] ?? null;
}

function collectLeaks(
  text: string,
  projectId: string,
  file: string,
  phase: "stored" | "served",
): PreviewAssetLeakHit[] {
  return scanBootstrapLeaksDetailed(text, projectId, {
    excludePlatformInjections: phase === "served",
    file,
  })
    .filter((m) => !m.safe)
    .map((leak) => ({ ...leak, file, phase }));
}

export async function scanPreviewArtifactLeaks(
  admin: SupabaseClient,
  projectId: string,
): Promise<PreviewAssetLeakScanReport | null> {
  const { data: proj } = await admin
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return null;

  const meta =
    proj.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
      ? (proj.metadata as Record<string, unknown>)
      : {};

  const artifactPath =
    (typeof meta.preview_artifact_path === "string" ? meta.preview_artifact_path : null) ?? null;
  const artifactId = artifactIdFromPath(artifactPath, projectId);

  const hits: PreviewAssetLeakHit[] = [];
  let filesScanned = 0;

  if (!artifactPath) {
    return {
      project_id: projectId,
      artifact_path: null,
      artifact_id: null,
      files_scanned: 0,
      stored_leak_count: 0,
      served_leak_count: 0,
      hits: [],
    };
  }

  const files = await listArtifactFiles(admin, artifactPath);

  for (const rel of files) {
    if (!TEXT_ARTIFACT_EXT.test(rel) && !PREVIEW_TEXT_ASSET_EXT.test(rel)) continue;
    const file = await downloadPreviewArtifactFile({ admin, artifactPath, relativePath: rel });
    if (!file) continue;
    filesScanned += 1;
    const raw = file.data.toString("utf8");
    hits.push(...collectLeaks(raw, projectId, rel, "stored"));

    let served = raw;
    if (/index\.html?$/i.test(rel) && artifactId) {
      served = rewritePreviewArtifactHtml(raw, projectId, artifactId, "/");
    } else {
      served = sanitizeServedPreviewAssetText(raw, projectId, "/");
    }
    hits.push(...collectLeaks(served, projectId, rel, "served"));
  }

  const stored_leak_count = hits.filter((h) => h.phase === "stored").length;
  const served_leak_count = hits.filter((h) => h.phase === "served").length;

  return {
    project_id: projectId,
    artifact_path: artifactPath,
    artifact_id: artifactId,
    files_scanned: filesScanned,
    stored_leak_count,
    served_leak_count,
    hits,
  };
}

export function formatPreviewAssetLeakReport(report: PreviewAssetLeakScanReport): string {
  const lines: string[] = [
    `project: ${report.project_id}`,
    `artifact: ${report.artifact_path ?? "—"} (${report.artifact_id ?? "—"})`,
    `files_scanned: ${report.files_scanned}`,
    `stored_leaks: ${report.stored_leak_count}`,
    `served_leaks: ${report.served_leak_count}`,
    "",
  ];

  if (report.hits.length === 0) {
    lines.push("✓ No preview-html route leaks detected in scanned assets.");
    return lines.join("\n");
  }

  for (const hit of report.hits) {
    lines.push(`[${hit.phase}] ${hit.file}`);
    lines.push(`  pattern: ${hit.pattern} (${hit.source})`);
    lines.push(`  snippet: ${hit.snippet}`);
    lines.push(`  repair: ${hit.repair}`);
    lines.push("");
  }
  return lines.join("\n");
}
