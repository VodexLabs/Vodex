import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(rel) {
  return fs.readFile(path.join(ROOT, rel), "utf8");
}

async function main() {
  const errors = [];
  const proxy = await read("src/proxy.ts");
  const gate = await read("src/components/onboarding/onboarding-app-gate.tsx");
  const layout = await read("src/app/(app)/layout.tsx");
  const provider = await read("src/components/providers/app-provider.tsx");
  const status = await read("src/lib/onboarding/onboarding-status.ts");

  if (!proxy.includes("onboarding_completed")) errors.push("proxy must redirect incomplete onboarding");
  if (!proxy.includes('from("onboarding")')) errors.push("proxy must check onboarding.completed_at");
  if (!gate.includes("useOnboardingComplete")) errors.push("OnboardingAppGate must verify via useOnboardingComplete");
  if (!layout.includes("OnboardingAppGate")) errors.push("(app) layout must wrap OnboardingAppGate");
  if (!provider.includes("mergeProfileOnboardingStatus")) errors.push("app-provider must merge onboarding status");
  if (!status.includes("invalidateBootstrapCache")) errors.push("onboarding-status must invalidate bootstrap cache");

  if (errors.length) {
    console.error("verify:onboarding-gate FAILED\n");
    errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
  console.log("verify:onboarding-gate OK");
}

main();
