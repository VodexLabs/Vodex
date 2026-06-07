import type { APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const CACHE_PATH = path.join(process.cwd(), "artifacts", "benchmarks", "p13", ".imported-project-cache.json");

export type ImportedProjectCandidate = {
  id: string;
  name: string;
  fileCount: number;
  source?: string;
};

function readCache(): ImportedProjectCandidate | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const row = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as ImportedProjectCandidate;
    return row?.id ? row : null;
  } catch {
    return null;
  }
}

function writeCache(row: ImportedProjectCandidate) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(row, null, 2));
}

/** Resolve an imported ZIP project the current session can open in the builder. */
export async function resolveImportedProjectId(
  request: APIRequestContext,
  opts?: { forceRefresh?: boolean },
): Promise<ImportedProjectCandidate | null> {
  const envId = process.env.E2E_IMPORTED_PROJECT_ID?.trim() || process.env.E2E_RECIPLY_PROJECT_ID?.trim();
  if (envId) {
    const cached = readCache();
    return { id: envId, name: cached?.name ?? "imported", fileCount: cached?.fileCount ?? 0, source: "zip_import" };
  }

  if (!opts?.forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const res = await request.get("/api/projects?reconcile=1", { timeout: 20_000 });
  if (!res.ok()) return readCache();
  const body = (await res.json()) as {
    projects?: Array<{ id: string; name?: string; app_name?: string; metadata?: { source?: string } }>;
  };
  const zipImports = (body.projects ?? []).filter((p) => p.metadata?.source === "zip_import");
  const reciplyNamed = zipImports.filter(
    (p) => /reciply/i.test(p.name ?? "") || /reciply/i.test(p.app_name ?? ""),
  );
  const candidates = (reciplyNamed.length > 0 ? reciplyNamed : zipImports).slice(0, 3);

  let best: ImportedProjectCandidate | null = null;
  for (const p of candidates) {
    const filesRes = await request.get(`/api/projects/${p.id}/files`, { timeout: 8_000 });
    if (!filesRes.ok()) continue;
    const filesJson = (await filesRes.json()) as { count?: number; files?: unknown[] };
    const fileCount = filesJson.count ?? filesJson.files?.length ?? 0;
    const row: ImportedProjectCandidate = {
      id: p.id,
      name: p.name ?? p.app_name ?? "imported",
      fileCount,
      source: p.metadata?.source,
    };
    if (!best || fileCount > best.fileCount) best = row;
  }

  if (best) writeCache(best);
  return best ?? readCache();
}
