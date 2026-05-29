import fs from "node:fs";
import path from "node:path";
import type { FailedStage } from "./restaurant-qa";

export const FINAL_RESTAURANT_E2E_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/final-restaurant-e2e-failure.json",
);

export function writeFinalRestaurantE2eFailure(payload: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(FINAL_RESTAURANT_E2E_FAILURE_PATH), { recursive: true });
  fs.writeFileSync(
    FINAL_RESTAURANT_E2E_FAILURE_PATH,
    JSON.stringify({ capturedAt: new Date().toISOString(), ...payload }, null, 2),
  );
}

export type FinalE2eStage =
  | FailedStage
  | "dev_server"
  | "credits"
  | "console_error"
  | "build_strategy"
  | "chat_enqueue";
