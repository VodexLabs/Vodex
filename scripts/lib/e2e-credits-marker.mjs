import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const E2E_CREDITS_MARKER_PATH = path.join(ROOT, ".e2e-credits-prepared.json");

export function writeE2eCreditsMarker(payload) {
  fs.writeFileSync(E2E_CREDITS_MARKER_PATH, JSON.stringify(payload, null, 2));
}

export function readE2eCreditsMarker() {
  try {
    if (!fs.existsSync(E2E_CREDITS_MARKER_PATH)) return null;
    return JSON.parse(fs.readFileSync(E2E_CREDITS_MARKER_PATH, "utf8"));
  } catch {
    return null;
  }
}

export function userHasE2eCreditsMarker(userId, email) {
  const marker = readE2eCreditsMarker();
  if (!marker) return false;
  if (marker.userId && marker.userId === userId) return true;
  if (marker.email && email && String(marker.email).toLowerCase() === email.toLowerCase()) {
    return true;
  }
  return false;
}
