/** Central operation types for cost-first model routing. */
export type AiOperationType =
  | "classify_intent"
  | "normalize_prompt"
  | "safety_scope_check"
  | "discuss_short"
  | "discuss_deep"
  | "build_intake"
  | "build_plan"
  | "app_identity"
  | "icon_svg_generation"
  | "schema_design"
  | "ui_design_plan"
  | "frontend_implementation"
  | "backend_implementation"
  | "integration_stub"
  | "file_validation"
  | "preview_validation"
  | "code_repair_small"
  | "code_repair_hard"
  | "diagnostics_summary"
  | "publish_readiness"
  | "admin_debug_summary"
  | "edit_target_detection"
  | "edit_patch_small"
  | "edit_patch_hard"
  | "discuss_stream"
  | "edit_stream"
  | "deep_architecture_review"
  | "massive_context_review"
  | "emergency_hard_repair";

export type ModelTier = "standard_fast" | "premium_implementation" | "ultra_owner_only";

export type RoutedModelSpec = {
  operationType: AiOperationType;
  tier: ModelTier;
  provider: "anthropic" | "openai" | "google" | "none";
  modelId: string;
  apiModelId: string;
  maxOutputTokens: number;
  maxInputTokens: number;
  temperature: number;
  strictJson: boolean;
  maxProviderCostUsd: number;
  routeReason: string;
  comingSoon?: boolean;
};
