import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZipImportFile } from "@/lib/import/zip-file-validator";

/** Upsert repaired source files into app_files for an imported project. */
export async function persistRepairedImportFiles(input: {
  admin: SupabaseClient;
  projectId: string;
  ownerId: string;
  files: ZipImportFile[];
  repairedPaths: string[];
}): Promise<{ ok: boolean; updated: number; error?: string }> {
  if (input.repairedPaths.length === 0) return { ok: true, updated: 0 };

  const byPath = new Map(input.files.map((f) => [f.path, f]));
  let updated = 0;

  for (const path of input.repairedPaths) {
    const file = byPath.get(path);
    if (!file) continue;
    const { error } = await input.admin.from("app_files").upsert(
      {
        project_id: input.projectId,
        owner_id: input.ownerId,
        path,
        content: file.content,
        mime_type: path.endsWith(".tsx") ? "text/typescript" : "text/javascript",
        source: "zip_import_repair",
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "project_id,path" },
    );
    if (error) {
      return { ok: false, updated, error: error.message };
    }
    updated += 1;
  }

  return { ok: true, updated };
}
