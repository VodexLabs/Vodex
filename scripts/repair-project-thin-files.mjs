#!/usr/bin/env node
/**
 * Repair known thin ZIP import shells in app_files (service role).
 * Usage: node scripts/repair-project-thin-files.mjs [projectId]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId =
  process.argv[2]?.trim() ?? "08a5e16a-66bc-41df-be97-cbc7c6df517e";

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { repairImportedThinFiles } = await import(
  "../src/lib/imports/repair-imported-thin-files.ts"
);
const { persistRepairedImportFiles } = await import(
  "../src/lib/imports/persist-repaired-import-files.ts"
);
const { isThinGeneratedFile } = await import("../src/lib/build/meaningful-file-guard.ts");

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: project, error: projErr } = await admin
  .from("projects")
  .select("id, owner_id, name")
  .eq("id", projectId)
  .maybeSingle();
if (projErr || !project) {
  console.error("Project not found:", projErr?.message ?? projectId);
  process.exit(1);
}

const { data: rows } = await admin
  .from("app_files")
  .select("path, content")
  .eq("project_id", projectId);

const zipFiles = (rows ?? []).map((r) => ({
  path: r.path,
  content: r.content ?? "",
  sizeBytes: Buffer.byteLength(r.content ?? "", "utf8"),
}));

const thinBefore = zipFiles
  .filter((f) => isThinGeneratedFile({ path: f.path, content: f.content }))
  .map((f) => f.path);

const { files, repairedPaths } = repairImportedThinFiles(zipFiles);
console.log(`Project: ${project.name} (${project.id})`);
console.log(`Thin before (${thinBefore.length}):`, thinBefore.slice(0, 20).join(", "));
console.log(`Repaired (${repairedPaths.length}):`, repairedPaths.join(", "));

if (repairedPaths.length === 0) {
  console.log("Nothing to repair.");
  process.exit(0);
}

const persisted = await persistRepairedImportFiles({
  admin,
  projectId,
  ownerId: project.owner_id,
  files,
  repairedPaths,
});

if (!persisted.ok) {
  console.error("Persist failed:", persisted.error);
  process.exit(1);
}

console.log(`✓ Updated ${persisted.updated} file(s). Run preview rebuild next.`);
