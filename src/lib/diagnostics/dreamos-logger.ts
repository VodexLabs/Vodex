import { sanitizeDiagnosticMetadata } from "@/lib/diagnostics/sanitize-metadata";

export type DreamosLogSeverity = "debug" | "info" | "warn" | "error";

export type DreamosLogCategory =
  | "general"
  | "missing_id"
  | "api_error"
  | "supabase"
  | "credit"
  | "build"
  | "ui_action"
  | "publish"
  | "admin"
  | "duplicate_prompt"
  | "provider_blocked"
  | "dom_wiring"
  | "frontend_error";

export type DreamosLogInput = {
  severity?: DreamosLogSeverity;
  source: "client" | "server";
  category?: DreamosLogCategory;
  route?: string | null;
  component?: string | null;
  action?: string | null;
  message: string;
  userId?: string | null;
  projectId?: string | null;
  conversationId?: string | null;
  buildId?: string | null;
  metadata?: Record<string, unknown>;
};

export type DreamosLogRow = DreamosLogInput & {
  severity: DreamosLogSeverity;
  category: DreamosLogCategory;
  at: string;
  metadata: Record<string, unknown>;
};

const CLIENT_KEY = "dreamos86.diagnosticLogs";
const CLIENT_MAX = 200;
const INGEST_BATCH_MS = 1200;
let ingestQueue: DreamosLogRow[] = [];
let ingestTimer: ReturnType<typeof setTimeout> | null = null;

function normalize(input: DreamosLogInput): DreamosLogRow {
  return {
    severity: input.severity ?? "info",
    source: input.source,
    category: input.category ?? "general",
    route: input.route ?? null,
    component: input.component ?? null,
    action: input.action ?? null,
    message: input.message,
    userId: input.userId ?? null,
    projectId: input.projectId ?? null,
    conversationId: input.conversationId ?? null,
    buildId: input.buildId ?? null,
    at: new Date().toISOString(),
    metadata: sanitizeDiagnosticMetadata(input.metadata),
  };
}

function pushClientBuffer(row: DreamosLogRow): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CLIENT_KEY);
    const prev: DreamosLogRow[] = raw ? (JSON.parse(raw) as DreamosLogRow[]) : [];
    sessionStorage.setItem(CLIENT_KEY, JSON.stringify([row, ...prev].slice(0, CLIENT_MAX)));
  } catch {
    /* quota */
  }
}

function flushIngestQueue(): void {
  if (typeof fetch === "undefined" || ingestQueue.length === 0) return;
  const batch = ingestQueue.splice(0, 40);
  ingestTimer = null;
  void fetch("/api/diagnostics/ingest", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: batch }),
  }).catch(() => {});
}

function scheduleIngest(row: DreamosLogRow): void {
  ingestQueue.push(row);
  if (ingestTimer) return;
  ingestTimer = setTimeout(flushIngestQueue, INGEST_BATCH_MS);
}

/** Central diagnostics logger — client + server. Never pass secrets in metadata. */
export function dreamosLog(input: DreamosLogInput): void {
  const row = normalize(input);
  if (row.source === "client") {
    pushClientBuffer(row);
    scheduleIngest(row);
  }
  if (process.env.NODE_ENV !== "production") {
    const line = `[dreamos:${row.category}] ${row.message}`;
    if (row.severity === "error") console.error(line, row.metadata);
    else if (row.severity === "warn") console.warn(line, row.metadata);
    else console.info(line, row.metadata);
  }
}

export function readClientDiagnosticLogs(): DreamosLogRow[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CLIENT_KEY);
    return raw ? (JSON.parse(raw) as DreamosLogRow[]) : [];
  } catch {
    return [];
  }
}

export function clearClientDiagnosticLogs(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(CLIENT_KEY);
}

export function logUiAction(
  phase: "click_started" | "validation_failed" | "missing_id" | "api_started" | "api_ok" | "api_failed" | "state_updated",
  message: string,
  ctx?: Omit<DreamosLogInput, "source" | "category" | "message">,
): void {
  dreamosLog({
    source: "client",
    category: "ui_action",
    severity: phase === "api_failed" || phase === "missing_id" ? "warn" : "info",
    action: phase,
    message,
    ...ctx,
  });
}

export function logMissingId(
  idName: string,
  ctx?: Partial<Omit<DreamosLogInput, "category" | "message" | "severity">>,
): void {
  dreamosLog({
    source: ctx?.source ?? "client",
    category: "missing_id",
    severity: "warn",
    message: `Missing required ID: ${idName}`,
    action: "missing_id",
    ...ctx,
  });
}
