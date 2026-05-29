#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { classifyBuildIntent, shouldStartBuildPipeline } from "./src/lib/ai/build-intent-classifier.ts";
const prompt = "Build a stunning developer portfolio with animated hero, project showcase, skills section, testimonials, and contact form.";
const intent = classifyBuildIntent(prompt);
if (intent.intent !== "build_app") throw new Error("expected build_app got " + intent.intent);
if (!shouldStartBuildPipeline("build", intent)) throw new Error("pipeline should start");
console.log("OK portfolio contact form → build_app");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim() || "OK");
