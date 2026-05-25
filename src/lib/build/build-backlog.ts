/**
 * Persistent project build backlog — queued upgrades for staged builds.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { BuildIntakeSummary } from "@/lib/ai/build-intake-types";
import type { FirstPassScope } from "@/lib/build/first-pass-scope";

export type BacklogCategory =
  | "ui"
  | "backend"
  | "auth"
  | "database"
  | "integration"
  | "analytics"
  | "polish"
  | "mobile"
  | "payments"
  | "deployment";

export type BacklogPriority = "now" | "next" | "later";
export type BacklogStatus = "queued" | "in_progress" | "completed" | "skipped";

export type BuildBacklogItem = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: BacklogCategory;
  priority: BacklogPriority;
  estimated_complexity: number;
  estimated_credits: number;
  status: BacklogStatus;
  source_prompt_excerpt: string | null;
  created_at: string;
  completed_at: string | null;
};

export type NewBacklogItem = Omit<
  BuildBacklogItem,
  "id" | "created_at" | "completed_at" | "status"
> & { status?: BacklogStatus };

const CATEGORY_RULES: Array<{ pattern: RegExp; category: BacklogCategory; complexity: number; credits: number }> = [
  { pattern: /\b(auth|login|signup|oauth|session|jwt)\b/i, category: "auth", complexity: 7, credits: 25 },
  { pattern: /\b(payment|stripe|checkout|billing|subscription)\b/i, category: "payments", complexity: 8, credits: 35 },
  { pattern: /\b(database|schema|table|entity|supabase|postgres)\b/i, category: "database", complexity: 6, credits: 20 },
  { pattern: /\b(api|webhook|integration|slack|discord|twilio)\b/i, category: "integration", complexity: 7, credits: 30 },
  { pattern: /\b(analytics|tracking|metrics|dashboard data)\b/i, category: "analytics", complexity: 5, credits: 15 },
  { pattern: /\b(deploy|publish|domain|vercel|production)\b/i, category: "deployment", complexity: 4, credits: 12 },
  { pattern: /\b(mobile|responsive|ios|android)\b/i, category: "mobile", complexity: 5, credits: 18 },
  { pattern: /\b(polish|animation|accessibility|a11y)\b/i, category: "polish", complexity: 3, credits: 10 },
  { pattern: /\b(backend|server|route handler)\b/i, category: "backend", complexity: 6, credits: 22 },
];

function classifyBacklogItem(title: string): {
  category: BacklogCategory;
  complexity: number;
  credits: number;
} {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(title)) {
      return { category: rule.category, complexity: rule.complexity, credits: rule.credits };
    }
  }
  return { category: "ui", complexity: 4, credits: 12 };
}

export function backlogItemsFromIntake(
  projectId: string,
  intake: BuildIntakeSummary,
  scope: FirstPassScope,
  sourceExcerpt?: string,
): NewBacklogItem[] {
  const excerpt = sourceExcerpt?.slice(0, 200) ?? null;
  const deferred = [
    ...scope.deferredFeatures,
    ...(intake.niceToHaveLaterFeatures ?? []),
    ...(intake.complexBackendRequirements ?? []),
  ];

  const seen = new Set<string>();
  const items: NewBacklogItem[] = [];

  for (const raw of deferred) {
    const title = raw.trim().slice(0, 120);
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());

    const { category, complexity, credits } = classifyBacklogItem(title);
    const priority: BacklogPriority =
      category === "backend" || category === "auth" ? "next" : "later";

    items.push({
      project_id: projectId,
      title,
      description: title,
      category,
      priority,
      estimated_complexity: complexity,
      estimated_credits: credits,
      source_prompt_excerpt: excerpt,
      status: "queued",
    });
  }

  return items.slice(0, 40);
}

export async function persistBuildBacklog(
  writer: SupabaseClient<Database>,
  input: { projectId: string; userId: string; items: NewBacklogItem[] },
): Promise<{ inserted: number; error: string | null }> {
  if (input.items.length === 0) return { inserted: 0, error: null };

  const rows = input.items.map((item) => ({
    project_id: input.projectId,
    user_id: input.userId,
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
    estimated_complexity: item.estimated_complexity,
    estimated_credits: item.estimated_credits,
    status: item.status ?? "queued",
    source_prompt_excerpt: item.source_prompt_excerpt,
  }));

  const { error } = await writer.from("project_build_backlog").upsert(rows as never, {
    onConflict: "project_id,title",
    ignoreDuplicates: true,
  });

  return { inserted: error ? 0 : rows.length, error: error?.message ?? null };
}

export async function loadBuildBacklog(
  writer: SupabaseClient<Database>,
  projectId: string,
  filter?: { category?: BacklogCategory; status?: BacklogStatus },
): Promise<BuildBacklogItem[]> {
  let q = writer
    .from("project_build_backlog")
    .select("*")
    .eq("project_id", projectId)
    .order("priority", { ascending: true })
    .order("estimated_complexity", { ascending: false });

  if (filter?.category) q = q.eq("category", filter.category);
  if (filter?.status) q = q.eq("status", filter.status);
  else q = q.in("status", ["queued", "in_progress"]);

  const { data, error } = await q.limit(50);
  if (error) return [];
  return (data ?? []) as BuildBacklogItem[];
}

export async function pickNextBacklogItems(
  writer: SupabaseClient<Database>,
  projectId: string,
  limit = 5,
  categoryFilter?: BacklogCategory,
): Promise<BuildBacklogItem[]> {
  const items = await loadBuildBacklog(writer, projectId, {
    category: categoryFilter,
    status: "queued",
  });
  const priorityOrder: Record<BacklogPriority, number> = { now: 0, next: 1, later: 2 };
  return items
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, limit);
}

export async function markBacklogInProgress(
  writer: SupabaseClient<Database>,
  itemIds: string[],
): Promise<void> {
  if (!itemIds.length) return;
  await writer
    .from("project_build_backlog")
    .update({ status: "in_progress" } as never)
    .in("id", itemIds);
}

export async function markBacklogCompleted(
  writer: SupabaseClient<Database>,
  itemIds: string[],
): Promise<void> {
  if (!itemIds.length) return;
  await writer
    .from("project_build_backlog")
    .update({ status: "completed", completed_at: new Date().toISOString() } as never)
    .in("id", itemIds);
}

export function estimateContinuationCredits(items: BuildBacklogItem[]): number {
  return items.reduce((sum, i) => sum + (i.estimated_credits ?? 12), 0);
}
