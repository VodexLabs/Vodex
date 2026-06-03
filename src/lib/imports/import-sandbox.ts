import "server-only";

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ZipImportFile } from "@/lib/import/zip-file-validator";
import { normalizeZipEntryPath, shouldSkipZipPath } from "@/lib/import/zip-file-validator";

const DANGEROUS_EXT = new Set([
  "exe",
  "dll",
  "so",
  "dylib",
  "bat",
  "cmd",
  "ps1",
  "sh",
  "bin",
]);

export type SandboxWorkspace = {
  rootDir: string;
  writtenFiles: number;
};

export async function createImportSandbox(
  files: ZipImportFile[],
  label: string,
): Promise<SandboxWorkspace> {
  const safe = label.replace(/[^a-z0-9-_]/gi, "").slice(0, 32) || "import";
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), `vodex-preview-${safe}-`));
  let writtenFiles = 0;

  for (const file of files) {
    const normalized = normalizeZipEntryPath(file.path);
    if (!normalized || shouldSkipZipPath(normalized)) continue;
    const ext = normalized.split(".").pop()?.toLowerCase() ?? "";
    if (DANGEROUS_EXT.has(ext)) continue;

    const dest = path.join(rootDir, normalized);
    const parent = path.dirname(dest);
    if (!dest.startsWith(rootDir)) continue;
    await fs.mkdir(parent, { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
    writtenFiles += 1;
  }

  return { rootDir, writtenFiles };
}

export async function cleanupSandbox(rootDir: string): Promise<void> {
  await fs.rm(rootDir, { recursive: true, force: true }).catch(() => undefined);
}

export function resolveArtifactOutputDir(
  framework: string,
  rootDir: string,
): { dir: string; indexCandidates: string[] } {
  if (framework === "static") {
    return { dir: rootDir, indexCandidates: ["index.html"] };
  }
  if (framework === "cra") {
    return { dir: path.join(rootDir, "build"), indexCandidates: ["index.html"] };
  }
  return {
    dir: path.join(rootDir, "dist"),
    indexCandidates: ["index.html"],
  };
}
