#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = `
import { parseBuildFilesFromModel } from "./src/lib/build/parse-build-files.ts";
import { filterRenderableBuildFiles } from "./src/lib/build/generated-file-utils.ts";

const json = JSON.stringify({
  files: [
    { path: "app/layout.tsx", content: "export default function L({c}){return <div>{c}</div>}" },
    { path: "app/page.tsx", content: "export default function P(){return <main className='p-6'><h1>Events</h1><table><tbody><tr><td>Show</td></tr></tbody></table></main>}" },
    { path: "app/tickets/page.tsx", content: "export default function T(){return <div>Tickets</div>}" },
    { path: "app/events/page.tsx", content: "export default function E(){return <div>Events</div>}" },
  ],
});
const parsed = parseBuildFilesFromModel(json);
if (parsed.files.length < 4) throw new Error("expected 4 files got " + parsed.files.length);
const fenced = parseBuildFilesFromModel(\`\\\`\\\`dreamos-app-meta\\n{"app":{"name":"X"}}\\n\\\`\\\`\\\`);
if (filterRenderableBuildFiles(fenced.files).length > 0) throw new Error("meta fence must not become source file");
console.log("build real files ok");
`;

const r = spawnSync("npx", ["tsx", "--eval", script], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim() || "✓ real files parse");
