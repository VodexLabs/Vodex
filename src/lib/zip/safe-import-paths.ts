const IGNORE_DIR_PREFIXES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  ".git/",
  ".turbo/",
  "coverage/",
];

const MAX_FILES = 400;
const MAX_FILE_BYTES = 1_500_000;
const MAX_TOTAL_UNCOMPRESSED = 40 * 1024 * 1024;

export type ZipImportFile = { path: string; content: string; sizeBytes: number };

export function shouldSkipZipPath(normalized: string): boolean {
  if (!normalized || normalized.endsWith("/")) return true;
  const lower = normalized.toLowerCase();
  if (IGNORE_DIR_PREFIXES.some((p) => lower.startsWith(p))) return true;
  return false;
}

/** Normalize entry path; returns null if unsafe (traversal, absolute, Windows roots). */
export function normalizeZipEntryPath(raw: string): string | null {
  let p = raw.replace(/\\/g, "/").trim();
  while (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/") || /^[a-z]:/i.test(p)) return null;
  const segments = p.split("/");
  if (segments.some((s) => s === "..")) return null;
  return segments.filter(Boolean).join("/");
}

export function detectFrameworkHint(files: ZipImportFile[]): string {
  const pkg = files.find((f) => f.path === "package.json");
  if (!pkg) return "unknown";
  try {
    const j = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dep = { ...j.dependencies, ...j.devDependencies };
    if (dep.next) return "nextjs";
    if (dep.vite || dep.vue) return "vite";
    if (dep.react || dep["react-dom"]) return "react";
    if (dep.express) return "express";
  } catch {
    /* ignore */
  }
  return "unknown";
}

export const ZIP_IMPORT_LIMITS = {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_UNCOMPRESSED,
};

export function accumulateIfOk(
  acc: { files: ZipImportFile[]; total: number },
  path: string,
  content: string,
): { ok: true } | { ok: false; error: string } {
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_FILE_BYTES) {
    return { ok: false, error: `File too large after extract: ${path}` };
  }
  if (acc.total + bytes > MAX_TOTAL_UNCOMPRESSED) {
    return { ok: false, error: "ZIP expands to more than the allowed total size" };
  }
  if (acc.files.length >= MAX_FILES) {
    return { ok: false, error: `Too many files (max ${MAX_FILES})` };
  }
  acc.files.push({ path, content, sizeBytes: bytes });
  acc.total += bytes;
  return { ok: true };
}
