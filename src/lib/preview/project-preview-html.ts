import type { SupabaseClient } from "@supabase/supabase-js";
import { isHiddenGeneratedPath } from "@/lib/build/generated-file-utils";
import { buildStaticPreviewHtml, type PreviewHtmlOptions } from "@/lib/preview/static-preview-builder";
import type { Database } from "@/lib/supabase/types";

const PAGE = 500;

export async function loadProjectFilesWithContent(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("app_files")
      .select("path, content")
      .eq("project_id", projectId)
      .order("path")
      .range(from, from + PAGE - 1);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      if (row.path && !isHiddenGeneratedPath(row.path)) {
        files.push({ path: row.path, content: row.content ?? "" });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return files;
}

export function buildProjectPreviewHtml(
  files: Array<{ path: string; content: string }>,
  options?: PreviewHtmlOptions & { archetypeId?: string | null },
): string {
  return buildStaticPreviewHtml(files, {
    projectId: options?.projectId,
    previewSessionId: options?.previewSessionId,
    archetypeId: options?.archetypeId,
  });
}

export async function resolveProjectPreviewHtml(
  client: SupabaseClient<Database>,
  projectId: string,
  meta: Record<string, unknown>,
): Promise<{ html: string; fileCount: number; archetypeId: string | null }> {
  const archetypeId =
    (typeof meta.app_archetype === "string" && meta.app_archetype) ||
    (typeof meta.archetype_id === "string" && meta.archetype_id) ||
    null;
  const files = await loadProjectFilesWithContent(client, projectId);
  const html = buildProjectPreviewHtml(files, {
    projectId,
    archetypeId,
    previewSessionId:
      typeof meta.last_preview_session_id === "string" ? meta.last_preview_session_id : undefined,
  });
  return { html, fileCount: files.length, archetypeId };
}
