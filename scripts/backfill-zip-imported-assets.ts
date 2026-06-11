#!/usr/bin/env npx tsx
/**
 * Backfill binary assets from stored ZIP archives into project media storage.
 * Usage: npx tsx scripts/backfill-zip-imported-assets.ts [--project <uuid>] [--all]
 */
import { createClient } from "@supabase/supabase-js";
import { importZipBinaryAssets } from "../src/lib/import/import-zip-binary-assets";
import { ZIP_IMPORT_BUCKET } from "../src/lib/import/zip-storage";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function backfillProject(projectId: string, userId: string, storagePath: string) {
  const { data: blob, error } = await admin.storage.from(ZIP_IMPORT_BUCKET).download(storagePath);
  if (error || !blob) {
    console.warn(`  skip ${projectId}: archive missing (${error?.message ?? "no file"})`);
    return { imported: 0, skipped: 0 };
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  const result = await importZipBinaryAssets({ admin, zipBuffer: buf, userId, projectId });
  console.log(`  ${projectId}: imported=${result.imported} skipped=${result.skipped} errors=${result.errors.length}`);
  return result;
}

async function main() {
  const projectFilter = arg("--project");
  const all = process.argv.includes("--all");

  if (!projectFilter && !all) {
    console.log("Usage: npx tsx scripts/backfill-zip-imported-assets.ts --project <uuid> | --all");
    process.exit(1);
  }

  let query = admin.from("imported_projects").select("project_id, user_id, source_archive_path");
  if (projectFilter) query = query.eq("project_id", projectFilter);

  const { data: rows, error } = await query;
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let totalImported = 0;
  for (const row of rows ?? []) {
    if (!row.source_archive_path) continue;
    const r = await backfillProject(row.project_id, row.user_id, row.source_archive_path);
    totalImported += r.imported;
  }

  console.log(`Done. Total imported: ${totalImported}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
