import { isZipImportProject, readImportMeta } from "@/lib/projects/imported-project-state";

/** Whether builder should poll import-status even when app_files is empty (ZIP artifact-only projects). */
export function shouldPollPreviewRuntime(input: {
  projectId: string | null | undefined;
  projectFilesCount: number;
  projectMetadata?: unknown;
  projectPreviewUrl?: string | null;
  previewArtifactId?: string | null;
}): boolean {
  if (!input.projectId) return false;
  if (input.projectFilesCount > 0) return true;

  const meta =
    input.projectMetadata && typeof input.projectMetadata === "object" && !Array.isArray(input.projectMetadata)
      ? (input.projectMetadata as Record<string, unknown>)
      : {};

  if (isZipImportProject(meta)) return true;

  const importMeta = readImportMeta(meta);
  if ((importMeta.file_count ?? 0) > 0) return true;

  if (input.projectPreviewUrl?.trim()) return true;
  if (input.previewArtifactId) return true;

  if (meta.preview_renderable === true) return true;
  if (typeof meta.preview_artifact_path === "string" && meta.preview_artifact_path) return true;
  if (typeof meta.preview_job_id === "string" && meta.preview_job_id) return true;

  return false;
}
