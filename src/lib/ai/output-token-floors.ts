import type { AiOperationType } from "@/lib/ai/operation-types";

/** Minimum output tokens — never shrink below these for quality-critical operations. */
export function minOutputTokensForOperation(
  operationType: AiOperationType,
  complexity = 5,
): number {
  switch (operationType) {
    case "frontend_implementation":
      if (complexity <= 4) return 3500;
      if (complexity <= 7) return 6500;
      return 10_000;
    case "backend_implementation":
      if (complexity <= 4) return 2800;
      if (complexity <= 7) return 4500;
      return 7000;
    case "code_repair_small":
      return 1500;
    case "code_repair_hard":
      return 4000;
    case "ui_design_plan":
      return 1000;
    case "schema_design":
      return 1000;
    case "edit_patch_hard":
    case "edit_stream":
      return 1700;
    default:
      return 400;
  }
}

export function isImplementationOperation(operationType: AiOperationType): boolean {
  return (
    operationType === "frontend_implementation" ||
    operationType === "backend_implementation" ||
    operationType === "code_repair_hard"
  );
}
