#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("✗ missing", rel);
    failed = true;
  } else console.log("✓", rel);
}

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

[
  "src/lib/projects/app-name-generator.ts",
  "src/lib/projects/app-identity-service.ts",
  "src/lib/projects/app-logo-generation.ts",
  "src/lib/action-credits/logo-generation-pricing.ts",
].forEach(mustExist);

mustInclude("src/lib/projects/app-name-generator.ts", "build_intent", "naming source");
mustInclude("src/lib/projects/app-name-generator.ts", "isValidAppName", "name validation");
mustInclude("src/lib/projects/app-identity-service.ts", "ensureIdempotentIdentity", "idempotent identity");
mustInclude("src/lib/projects/app-identity-service.ts", "createAppIdentityForBuild", "build identity entry");
mustInclude("src/lib/build/build-pipeline.ts", "createAppIdentityForBuild", "pipeline uses identity service");
mustInclude("src/lib/action-credits/action-catalog.ts", "app_logo_generation", "logo action catalog");

const evalScript = `
import { classifyCreateIntent } from "./src/lib/intent/create-intent-classifier.ts";
const q = classifyCreateIntent("which app should i start building?? give me 20 ideas", false);
if (q.shouldCreateProject) throw new Error("idea prompt should not create project");
const b = classifyCreateIntent("build me a restaurant inventory app", false);
if (!b.shouldCreateProject) throw new Error("build prompt should create project");
import { generateAppName } from "./src/lib/projects/app-name-generator.ts";
const name = await generateAppName({
  buildIntent: "which app should i start building?? give me 20 ideas",
  userId: "verify-user",
  operationId: "verify:name",
});
if (name.appName.length > 24 || /which app/i.test(name.appName)) throw new Error("bad fallback name from question");
console.log("app identity generation ok");
`;

const r = spawnSync("npx", ["tsx", "--eval", evalScript], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  failed = true;
} else {
  console.log(r.stdout?.trim() || "✓ runtime name checks");
}

process.exit(failed ? 1 : 0);
