import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listAppVersions, type AppVersionRow } from "@/lib/projects/app-version-history";
import { listPublishVersions, type PublishVersionRow } from "@/lib/publish/publish-versioning";

export type ProjectPromptEntry = {
  id: string;
  prompt: string;
  created_at: string;
  source: "message" | "build_job";
  build_job_id?: string | null;
  build_status?: string | null;
};

export type ProjectVersionTimelineEntry = {
  id: string;
  kind: "prompt" | "snapshot" | "published";
  created_at: string;
  title: string;
  subtitle?: string;
  prompt?: string;
  version_id?: string;
  version_number?: number;
  publish_version?: number;
  is_current_preview?: boolean;
  is_live_published?: boolean;
  changed_paths?: string[] | null;
  mode?: string | null;
};

export type ProjectVersionTimeline = {
  entries: ProjectVersionTimelineEntry[];
  prompts: ProjectPromptEntry[];
  versions: AppVersionRow[];
  published_versions: PublishVersionRow[];
  current_preview_version_id: string | null;
  live_published_version: number | null;
  project_published_at: string | null;
};

export async function listProjectPromptHistory(
  admin: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<ProjectPromptEntry[]> {
  const prompts: ProjectPromptEntry[] = [];
  const seen = new Set<string>();

  const { data: conversations } = await admin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", ownerId);

  const conversationIds = (conversations ?? []).map((c) => c.id);
  if (conversationIds.length > 0) {
    const { data: messages } = await admin
      .from("messages")
      .select("id, content, created_at, conversation_id")
      .in("conversation_id", conversationIds)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(80);

    for (const row of messages ?? []) {
      const text = row.content?.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      prompts.push({
        id: row.id,
        prompt: text,
        created_at: row.created_at,
        source: "message",
      });
    }
  }

  const { data: jobs } = await admin
    .from("build_jobs")
    .select("id, prompt, status, created_at")
    .eq("project_id", projectId)
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(40);

  for (const job of jobs ?? []) {
    const text = job.prompt?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    prompts.push({
      id: `job:${job.id}`,
      prompt: text,
      created_at: job.created_at,
      source: "build_job",
      build_job_id: job.id,
      build_status: job.status,
    });
  }

  return prompts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function buildProjectVersionTimeline(
  admin: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<ProjectVersionTimeline> {
  const [versions, published_versions, prompts, projectRow] = await Promise.all([
    listAppVersions(admin, projectId, 40),
    listPublishVersions(admin, projectId, ownerId),
    listProjectPromptHistory(admin, projectId, ownerId),
    admin
      .from("projects")
      .select("published_at, metadata")
      .eq("id", projectId)
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);

  const meta =
    projectRow.data?.metadata &&
    typeof projectRow.data.metadata === "object" &&
    !Array.isArray(projectRow.data.metadata)
      ? (projectRow.data.metadata as Record<string, unknown>)
      : {};
  const currentPreviewVersionId =
    typeof meta.current_preview_version_id === "string"
      ? meta.current_preview_version_id
      : versions[0]?.id ?? null;

  const livePublishedVersion =
    published_versions[0]?.version ??
    (typeof meta.live_publish_version === "number" ? meta.live_publish_version : null);

  const entries: ProjectVersionTimelineEntry[] = [];

  for (const p of prompts) {
    entries.push({
      id: `prompt:${p.id}`,
      kind: "prompt",
      created_at: p.created_at,
      title: "Build prompt",
      subtitle: p.source === "build_job" ? `Build job · ${p.build_status ?? "unknown"}` : "Chat prompt",
      prompt: p.prompt,
    });
  }

  for (const v of versions) {
    const isCurrentPreview = v.id === currentPreviewVersionId || v.id === versions[0]?.id;
    entries.push({
      id: `snapshot:${v.id}`,
      kind: "snapshot",
      created_at: v.created_at,
      title: isCurrentPreview ? "Current preview build" : `Saved snapshot v${v.version_number}`,
      subtitle: v.summary ?? undefined,
      version_id: v.id,
      version_number: v.version_number,
      is_current_preview: isCurrentPreview,
      changed_paths: v.changed_paths,
      mode: v.mode,
    });
  }

  for (const pub of published_versions) {
    entries.push({
      id: `published:${pub.id ?? pub.version}`,
      kind: "published",
      created_at: pub.published_at ?? new Date().toISOString(),
      title: `Published v${pub.version}`,
      subtitle: pub.public_url,
      publish_version: pub.version,
      is_live_published: pub.version === livePublishedVersion,
    });
  }

  entries.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    entries,
    prompts,
    versions,
    published_versions,
    current_preview_version_id: currentPreviewVersionId,
    live_published_version: livePublishedVersion,
    project_published_at: projectRow.data?.published_at ?? null,
  };
}
