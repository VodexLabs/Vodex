import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts/benchmarks/p13/live-generated-app.json",
);

export type LiveGeneratedAppArtifact = {
  capturedAt: string;
  pass: boolean;
  project_id: string;
  build_job_id: string | null;
  archetype: string | null;
  scaffold_id: string | null;
  files_persisted: number;
  source_integrity_score: number | null;
  source_integrity_ok: boolean | null;
  preview_status: string | null;
  preview_session_id: string | null;
  slug: string | null;
  publish_url: string | null;
  failure_kind: string | null;
  failure_detail: string | null;
};

export async function writeLiveGeneratedAppArtifact(
  request: APIRequestContext,
  input: {
    projectId: string;
    buildJobId: string | null;
    pass: boolean;
    previewSessionId?: string | null;
    publishUrl?: string | null;
    failureKind?: string | null;
    failureDetail?: string | null;
  },
): Promise<LiveGeneratedAppArtifact> {
  const summaryRes = await request.get(`/api/projects/${input.projectId}/summary`).catch(() => null);
  const summary = summaryRes?.ok() ? await summaryRes.json() : {};
  const proj = summary.project ?? summary;
  const meta = (proj.metadata ?? {}) as Record<string, unknown>;

  const filesRes = await request.get(`/api/projects/${input.projectId}/files`);
  const filesBody = filesRes.ok() ? await filesRes.json() : {};
  const filesPersisted = Number(filesBody.count ?? 0);

  const statusRes = await request.get(`/api/projects/${input.projectId}/status`).catch(() => null);
  const statusBody = statusRes?.ok() ? await statusRes.json() : {};
  const buildJob = statusBody.buildJob ?? null;
  const jobMeta =
    buildJob?.meta && typeof buildJob.meta === "object"
      ? (buildJob.meta as Record<string, unknown>)
      : {};

  const archetype = String(meta.app_archetype ?? jobMeta.app_archetype ?? "unknown");
  const artifact: LiveGeneratedAppArtifact = {
    capturedAt: new Date().toISOString(),
    pass: input.pass,
    project_id: input.projectId,
    build_job_id: input.buildJobId,
    archetype,
    scaffold_id: archetype,
    files_persisted: filesPersisted,
    source_integrity_score:
      typeof meta.ui_quality_score === "number"
        ? meta.ui_quality_score
        : typeof jobMeta.ui_quality_score === "number"
          ? (jobMeta.ui_quality_score as number)
          : null,
    source_integrity_ok:
      typeof meta.source_integrity_ok === "boolean"
        ? meta.source_integrity_ok
        : filesPersisted >= 6
          ? true
          : null,
    preview_status: proj.preview_status ?? statusBody.previewStatus ?? null,
    preview_session_id:
      input.previewSessionId ??
      (typeof meta.last_preview_session_id === "string" ? meta.last_preview_session_id : null),
    slug: typeof meta.publish_slug === "string" ? meta.publish_slug : null,
    publish_url: input.publishUrl ?? proj.preview_url ?? null,
    failure_kind: input.failureKind ?? null,
    failure_detail: input.failureDetail ?? null,
  };

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2));
  console.info("[live-generated-app]", `pass=${artifact.pass} files=${artifact.files_persisted} path=${ARTIFACT_PATH}`);
  return artifact;
}

export { ARTIFACT_PATH };
