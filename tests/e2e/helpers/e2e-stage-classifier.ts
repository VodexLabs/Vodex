/** Classify restaurant E2E failure stage from build events + file state. */
export type E2eFailureStage =
  | "build_worker"
  | "build_events"
  | "preview"
  | "publish"
  | "dashboard_unlock"
  | "generated_files"
  | "import_graph"
  | "ui_quality";

export function classifyE2eFailureStage(input: {
  events: string[];
  filesCount?: number;
  buildStatus?: string | null;
  previewUrl?: string | null;
  diag?: string;
}): E2eFailureStage {
  const joined = input.events.join(" ").toLowerCase();
  const diag = (input.diag ?? "").toLowerCase();
  const files = input.filesCount ?? 0;
  const buildStatus = (input.buildStatus ?? "").toLowerCase();

  if (!joined.includes("worker") && !joined.includes("claimed") && !joined.includes("plan")) {
    if (diag.includes("worker") || diag.includes("no worker")) return "build_worker";
  }

  const persistDone =
    joined.includes("persist") ||
    joined.includes("files_persisted") ||
    joined.includes("persist_completed") ||
    diag.includes("persist_completed");
  const previewStarted =
    joined.includes("preview") ||
    joined.includes("validating_preview") ||
    diag.includes("preview_started") ||
    diag.includes("validating_preview") ||
    buildStatus === "preview_failed" ||
    diag.includes("preview_failed");

  if (
    (persistDone && previewStarted && files > 0) ||
    (files > 0 && (buildStatus === "preview_failed" || diag.includes("validating_preview")))
  ) {
    return "preview";
  }

  if (joined.includes("preview_ready") && !input.previewUrl && files > 0) return "publish";

  if (files > 0 && (joined.includes("contract") || joined.includes("quality"))) {
    if (joined.includes("ui") || diag.includes("ui_quality")) return "ui_quality";
    if (joined.includes("import") || diag.includes("import")) return "import_graph";
    return "generated_files";
  }

  if (files === 0 && !joined.includes("writ") && !joined.includes("generat")) {
    return "build_events";
  }

  if (files > 0) return "generated_files";

  return "build_events";
}
