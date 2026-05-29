import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.join(process.cwd(), "tests/e2e/evidence");

/** Stale artifacts that must not bleed into the next restaurant E2E run. */
export const STALE_RESTAURANT_E2E_EVIDENCE = [
  "restaurant-qa-report.json",
  "preview-render-failure.json",
  "final-restaurant-e2e-failure.json",
] as const;

export function clearStaleRestaurantE2eEvidence(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const name of STALE_RESTAURANT_E2E_EVIDENCE) {
    try {
      fs.unlinkSync(path.join(EVIDENCE_DIR, name));
    } catch {
      /* missing is fine */
    }
  }
}
