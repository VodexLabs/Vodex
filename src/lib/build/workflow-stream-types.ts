/** Canonical agent workflow stream event categories (UI + coalescing). */

export type AgentWorkflowCategory =
  | "assistant_message"
  | "phase_started"
  | "phase_completed"
  | "task_started"
  | "task_completed"
  | "file_read"
  | "file_created"
  | "file_edited"
  | "file_deleted"
  | "code_patch"
  | "quality_check"
  | "issue_found"
  | "repair_started"
  | "repair_completed"
  | "preview_ready"
  | "partial_credit_stop"
  | "failed_before_generation"
  | "failed_after_generation"
  | "completed";

export type AgentWorkflowEventStatus = "pending" | "active" | "done" | "failed";

export type AgentWorkflowEvent = {
  id: string;
  category: AgentWorkflowCategory;
  title: string;
  subtitle?: string;
  progress?: number;
  phase?: string;
  status: AgentWorkflowEventStatus;
  filePath?: string;
  addedLines?: number;
  removedLines?: number;
  metadata?: Record<string, unknown>;
  at: string;
  /** Stable key for coalescing duplicate rows */
  stableKey: string;
};

export type AgentWorkflowActiveState = {
  phaseLabel: string;
  taskLabel: string;
  progressPercent: number;
  currentFile?: string;
  ephemeralHint?: string;
};
