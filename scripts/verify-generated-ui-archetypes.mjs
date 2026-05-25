#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = `
import { classifyAppArchetype } from "./src/lib/build/app-archetype-classifier.ts";
import { buildDesignBrief } from "./src/lib/build/design-brief-generator.ts";

const r = classifyAppArchetype("Create a restaurant food inventory management app for my restaurant");
if (r.id !== "restaurant_inventory") throw new Error("expected restaurant_inventory got " + r.id);
const m = classifyAppArchetype("Build a marina slip assignment and maintenance app");
if (m.id !== "marina_operations") throw new Error("expected marina_operations got " + m.id);
const brief = buildDesignBrief({ buildIntent: r.label, archetype: r, appName: "StockBite", planPages: ["dashboard", "inventory"] });
if (brief.routes.length < 3) throw new Error("brief routes too few");
if (!brief.promptBlock.includes("DESIGN BRIEF")) throw new Error("missing design brief block");
console.log("archetypes ok");
`;

const r = spawnSync("npx", ["tsx", "--eval", script], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim() || "✓ archetypes");
