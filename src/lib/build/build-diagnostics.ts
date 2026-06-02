import type { BuildJobEventRow } from "@/lib/build/build-job-events";
import type { PreviewFailureCode } from "@/lib/preview/preview-failure-codes";
import { formatSlowStepWarning, type SlowStepEvent } from "@/lib/build/slow-step-detection";

export type BuildDiagnosticsPayload = {
  build_job_id: string;
  project_id: string;
  app_id?: string | null;
  actor_user_id?: string | null;
  workspace_id?: string | null;
  operation_id?: string | null;
  user_prompt?: string | null;
  mode_at_submit?: string | null;
  model_used?: string | null;
  model_routing?: Record<string, unknown> | null;
  billing_target?: string | null;
  step_timeline: BuildJobEventRow[];
  file_events: BuildJobEventRow[];
  failed_step?: string | null;
  failure_code?: PreviewFailureCode | string | null;
  failure_message?: string | null;
  stack_trace?: string | null;
  logs?: string[];
  preview_url?: string | null;
  preview_response?: string | null;
  source_integrity_report?: Record<string, unknown> | null;
  generated_files?: string[];
  thin_or_missing_files?: string[];
  package_json_excerpt?: string | null;
  root_page_excerpt?: string | null;
  dashboard_page_excerpt?: string | null;
  layout_excerpt?: string | null;
  preview_diagnostics?: Record<string, unknown> | null;
  credit_explanation?: string | null;
  repair_attempts?: unknown[];
  credit_events?: unknown[];
  ai_usage_rows?: unknown[];
  credit_accounting?: Record<string, unknown> | null;
  field_missing_notes?: Record<string, string>;
  slow_steps?: SlowStepEvent[];
  metadata?: Record<string, unknown>;
};

export function buildCopyFixPrompt(diag: BuildDiagnosticsPayload): string {
  const lines = [
    "# DreamOS / Vodex build failure — fix prompt",
    "",
    "## Original user prompt",
    diag.user_prompt ?? "(not recorded)",
    "",
    "## Build context",
    `- route: ${typeof diag.metadata?.route === "string" ? diag.metadata.route : "unknown"}`,
    `- mode_at_submit: ${diag.mode_at_submit ?? "unknown"}`,
    `- build_job_id: ${diag.build_job_id}`,
    `- project_id: ${diag.project_id}`,
    `- operation_id: ${diag.operation_id ?? "n/a"}`,
    `- app_id: ${diag.app_id ?? "n/a"}`,
    `- model: ${diag.model_used ?? "unknown"}`,
    `- billing_target: ${diag.billing_target ?? "unknown"}`,
    `- actor_user_id: ${diag.actor_user_id ?? "n/a"}`,
    `- workspace_id: ${diag.workspace_id ?? "n/a"}`,
    "",
    "## Failed step",
    diag.failed_step ?? "unknown",
    "",
    "## Error",
    `- code: ${diag.failure_code ?? "unknown"}`,
    `- message: ${diag.failure_message ?? "unknown"}`,
    "",
    "## Stack trace",
    "```",
    diag.stack_trace ?? "(none)",
    "```",
    "",
    "## Source integrity",
    "```json",
    JSON.stringify(diag.source_integrity_report ?? {}, null, 2),
    "```",
    "",
    "## Generated files",
    (diag.generated_files ?? []).slice(0, 80).join("\n") || "(none)",
    "",
    "## Thin or shallow files",
    (diag.thin_or_missing_files ?? []).join("\n") || "(none flagged)",
    "",
    "## Field linkage notes",
    "```json",
    JSON.stringify(diag.field_missing_notes ?? {}, null, 2),
    "```",
    "",
    "## Credit accounting",
    diag.credit_explanation ?? "(see JSON below)",
    "",
    "```json",
    JSON.stringify(diag.credit_accounting ?? {}, null, 2),
    "```",
    "",
    "## Preview diagnostics",
    "```json",
    JSON.stringify(diag.preview_diagnostics ?? {}, null, 2),
    "```",
    "",
    "## app/dashboard/page.tsx excerpt",
    "```tsx",
    diag.dashboard_page_excerpt ?? "(missing)",
    "```",
    "",
    "## app/layout.tsx excerpt",
    "```tsx",
    diag.layout_excerpt ?? "(missing)",
    "```",
    "",
    "## AI usage rows",
    "```json",
    JSON.stringify((diag.ai_usage_rows ?? []).slice(0, 20), null, 2),
    "```",
    "",
    "## Preview diagnostics",
    `- url: ${diag.preview_url ?? "n/a"}`,
    `- response excerpt:`,
    "```",
    (diag.preview_response ?? "(none)").slice(0, 4000),
    "```",
    "",
    "## package.json excerpt",
    "```json",
    diag.package_json_excerpt ?? "(missing)",
    "```",
    "",
    "## app/page.tsx excerpt",
    "```tsx",
    diag.root_page_excerpt ?? "(missing)",
    "```",
    "",
    "## Repair attempts",
    "```json",
    JSON.stringify(diag.repair_attempts ?? [], null, 2),
    "```",
    "",
    "## Credit events",
    "```json",
    JSON.stringify(diag.credit_events ?? [], null, 2),
    "```",
    "",
    "## Step timeline (recent)",
    "```json",
    JSON.stringify(
      (diag.step_timeline ?? []).slice(-40).map((e) => ({
        type: e.type,
        title: e.title,
        detail: e.detail,
        at: e.created_at,
        meta: e.metadata,
      })),
      null,
      2,
    ),
    "```",
    "",
    "## Logs",
    (diag.logs ?? []).join("\n") || "(none)",
    "",
    "## Slow steps",
    (diag.slow_steps ?? []).map(formatSlowStepWarning).join("\n") || "(none)",
    "",
    "## Expected behavior",
    "Preview should render the generated Next.js app with a valid root page and layout.",
    "",
    "## Instruction",
    "Find the root cause and fix it without hiding the failure. Do not mask errors with generic success copy.",
  ];
  return lines.join("\n");
}
