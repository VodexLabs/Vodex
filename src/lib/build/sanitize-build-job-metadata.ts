import { MAX_EVENT_LOG_CHARS } from "@/lib/diagnostics/payload-limits";
import {
  sanitizeDiagnosticMetadata,
  truncateLargeDiagnosticString,
} from "@/lib/diagnostics/truncate-large-diagnostic-string";

export function sanitizeBuildJobEventDetail(detail: string | null | undefined): string | null {
  if (detail == null || detail === "") return null;
  return truncateLargeDiagnosticString(detail, MAX_EVENT_LOG_CHARS);
}

export function sanitizeBuildJobEventMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return sanitizeDiagnosticMetadata(metadata);
}
