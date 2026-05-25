import { isZipImportProject, readImportMeta } from "@/lib/projects/imported-project-state";

export type ProjectFilesReadyInput = {
  metadata?: unknown;
  fileCount?: number;
  build_status?: string | null;
  loadedPathCount?: number;
};

/** True when the project has app files (generated or imported) — not an empty draft. */
export function isProjectFilesReady(input: ProjectFilesReadyInput | null | undefined): boolean {
  if (!input) return false;
  const loaded = input.loadedPathCount ?? input.fileCount ?? 0;
  if (loaded > 0) return true;
  if (input.build_status === "imported" || input.build_status === "completed") return true;

  const meta =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : null;
  if (!meta) return false;

  if (meta.source === "zip_import") return true;
  if (isZipImportProject(meta)) {
    const imp = readImportMeta(meta);
    if ((imp.file_count ?? 0) > 0) return true;
  }
  if (typeof meta.file_count === "number" && meta.file_count > 0) return true;
  return false;
}

export function isImportedProjectReady(input: ProjectFilesReadyInput | null | undefined): boolean {
  if (!input?.metadata) return false;
  return isZipImportProject(input.metadata) || (input.metadata as Record<string, unknown>).source === "zip_import";
}
