#!/usr/bin/env node
/**
 * Generated UI quality gate — fixture tests + optional Playwright smoke when server available.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("✗ missing", rel);
    failed = true;
  } else console.log("✓", rel);
}

[
  "src/lib/build/app-archetype-classifier.ts",
  "src/lib/build/design-brief-generator.ts",
  "src/lib/build/ui-quality-contract.ts",
  "src/lib/build/generated-app-design-system.ts",
  "src/lib/build/generated-ui-patterns.ts",
  "src/lib/build/generated-ui-quality-checker.ts",
  "src/lib/build/generated-ui-repair-pass.ts",
].forEach(mustExist);

const evalScript = `
import { classifyAppArchetype } from "./src/lib/build/app-archetype-classifier.ts";
import { checkGeneratedUiQuality, previewReadyMinScore } from "./src/lib/build/generated-ui-quality-checker.ts";

const BASIC = [
  { path: "app/page.tsx", content: \`export default function Page() {
  return <main className="p-8"><h1>Welcome to Marina Management</h1>
  <div className="card rounded border p-4">Card 1</div>
  <div className="card rounded border p-4">Card 2</div>
  <div className="card rounded border p-4">Card 3</div></main>;
}\` },
];
const basic = checkGeneratedUiQuality({ files: BASIC, appType: "admin_panel" });
if (basic.passesPreview) throw new Error("basic welcome+cards must not pass preview");
if (basic.score >= previewReadyMinScore()) throw new Error("basic layout score too high: " + basic.score);
if (!basic.basicUiFailure) throw new Error("expected basicUiFailure");

const RICH = [
  { path: "app/layout.tsx", content: \`'use client'; export default function L({ children }) {
  return <div className="flex min-h-screen"><nav className="w-56 border-r p-4"><a href="/dashboard">Dashboard</a><a href="/inventory">Inventory</a></nav>{children}</div>;
}\` },
  { path: "app/page.tsx", content: \`export default function Home() {
  return <section className="p-6 space-y-6"><h1 className="text-3xl font-bold">Kitchen overview</h1>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="metric card rounded-xl shadow-sm border p-4">Stock value $12k</div>
    <div className="metric card rounded-xl shadow-sm border p-4">Low stock 8</div>
    <div className="metric card rounded-xl shadow-sm border p-4">Expiring 3</div>
  </div>
  <table className="w-full text-sm"><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody><tr><td>Salmon</td><td>12</td></tr></tbody></table>
  <div className="empty text-sm">No alerts</div><div className="loading animate-pulse">Loading</div></section>;
}\` },
  { path: "app/inventory/page.tsx", content: \`export default function Inv() {
  return <div className="p-4"><input placeholder="Search inventory" className="border rounded-lg px-3" />
  <button className="bg-orange-600 text-white rounded-lg px-3 py-2" onClick={() => {}}>Reorder</button></div>;
}\` },
];
const rich = checkGeneratedUiQuality({ files: RICH, appType: "saas_dashboard", routeMap: ["/", "/inventory", "/dashboard"] });
if (!rich.passesPreview) throw new Error("rich restaurant UI should pass: score " + rich.score + " failures " + rich.failures.join(","));
if (rich.score < previewReadyMinScore()) throw new Error("rich score below min: " + rich.score);

const restaurant = classifyAppArchetype("Create a restaurant food inventory management app for my restaurant");
console.log("ui quality gate ok score=" + rich.score + " archetype=" + restaurant.id);
`;

const r = spawnSync("npx", ["tsx", "--eval", evalScript], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  failed = true;
} else {
  console.log(r.stdout?.trim() || "✓ fixture quality gate");
}

const pipeline = fs.readFileSync(path.join(root, "src/lib/build/build-pipeline.ts"), "utf8");
if (!pipeline.includes("checkGeneratedUiQuality")) {
  console.error("✗ build pipeline missing UI quality checker");
  failed = true;
} else console.log("✓ pipeline uses UI quality checker");

if (!pipeline.includes("buildDesignBrief")) {
  console.error("✗ build pipeline missing design brief");
  failed = true;
} else console.log("✓ pipeline uses design brief");

process.exit(failed ? 1 : 0);
