/** Normalize and classify generated build file paths/content. */

export type BuildFile = { path: string; content: string; language?: string };

const HIDDEN_PATH_RE =
  /(?:^|\/)snippet-\d+\.(?:dreamosappmeta|txt|json)$|dreamos-app-meta|\.dreamos|\/\.dreamos/i;

const RENDERABLE_PATH_RE =
  /\.(tsx|jsx|ts|js|mjs|cjs|css|html|json)$/i;

const METADATA_JSON_RE = /^\s*\{[\s\S]*"(?:app|build_plan|plan|summary)"\s*:/;

export function normalizeBuildFilePath(path: string): string {
  return path.replace(/^\.?\//, "").replace(/\\/g, "/").trim();
}

export function isHiddenGeneratedPath(path: string): boolean {
  const p = normalizeBuildFilePath(path);
  if (!p || p.length > 512) return true;
  if (HIDDEN_PATH_RE.test(p)) return true;
  if (p.includes("..")) return true;
  return false;
}

export function isRenderableSourcePath(path: string): boolean {
  const p = normalizeBuildFilePath(path);
  if (isHiddenGeneratedPath(p)) return false;
  if (p === "package.json") return true;
  if (/^app\//i.test(p)) return true;
  return RENDERABLE_PATH_RE.test(p);
}

export function isMetadataOnlyContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (METADATA_JSON_RE.test(trimmed) && !/export\s+(default|function)|import\s+/.test(trimmed)) {
    return true;
  }
  if (/^```dreamos-app-meta/i.test(trimmed)) return true;
  return false;
}

export function isPageSourceFile(path: string): boolean {
  const p = normalizeBuildFilePath(path);
  return (
    /(^|\/)page\.(tsx|jsx|js)$/i.test(p) ||
    /(^|\/)pages?\//i.test(p) ||
    /index\.html$/i.test(p)
  );
}

export function filterRenderableBuildFiles(files: BuildFile[]): BuildFile[] {
  const seen = new Set<string>();
  const out: BuildFile[] = [];
  for (const f of files) {
    if (!f.path || !f.content?.trim()) continue;
    const path = normalizeBuildFilePath(f.path);
    if (!isRenderableSourcePath(path)) continue;
    if (isMetadataOnlyContent(f.content)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({
      path,
      content: f.content,
      language: f.language ?? path.split(".").pop() ?? "text",
    });
  }
  return out;
}

export function countRenderablePages(files: BuildFile[]): number {
  return files.filter((f) => isPageSourceFile(f.path)).length;
}

export function hasRequiredLayout(files: BuildFile[]): boolean {
  return files.some((f) => /(^|\/)app\/layout\.(tsx|jsx|js)$/i.test(normalizeBuildFilePath(f.path)));
}

export function hasRequiredHome(files: BuildFile[]): boolean {
  return files.some((f) => /(^|\/)app\/page\.(tsx|jsx|js)$/i.test(normalizeBuildFilePath(f.path)));
}

export function hasRouteFiles(files: BuildFile[]): boolean {
  return countRenderablePages(files) > 0;
}
