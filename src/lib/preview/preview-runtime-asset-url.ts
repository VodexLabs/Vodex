/** Canonical preview-runtime asset URL helpers (P1.3.38). */

const RUNTIME_PREFIX = "/preview-runtime/";

export function buildPreviewRuntimeAssetUrl(input: {
  projectId: string;
  artifactBuildId: string;
  relativePath: string;
  version?: string | number | null;
}): string {
  const clean = input.relativePath.replace(/^\//, "");
  const base = `${RUNTIME_PREFIX}${encodeURIComponent(input.projectId)}/${encodeURIComponent(input.artifactBuildId)}/assets/${clean.split("/").map(encodeURIComponent).join("/")}`;
  if (input.version != null && input.version !== "") {
    return `${base}?v=${encodeURIComponent(String(input.version))}`;
  }
  return base;
}

export function buildPreviewRuntimeAssetBase(input: {
  projectId: string;
  artifactBuildId: string;
}): string {
  return `${RUNTIME_PREFIX}${encodeURIComponent(input.projectId)}/${encodeURIComponent(input.artifactBuildId)}/assets/`;
}

export function isPreviewRuntimeAssetPath(url: string): boolean {
  return url.includes("/preview-runtime/") && url.includes("/assets/");
}
