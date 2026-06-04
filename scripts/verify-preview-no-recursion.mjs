#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function must(rel, needles) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  for (const n of needles) {
    if (!src.includes(n)) errors.push(`${rel}: missing ${n}`);
  }
}

must("src/lib/dev/owner-incident-store.ts", ["syncingDiagnostics", "if (syncingDiagnostics) return"]);
must("src/lib/preview/preview-runtime-status-equal.ts", ["previewRuntimeStatusEqual"]);
must("src/components/create/workspace/immersive-workspace.tsx", ["previewRuntimeStatusEqual"]);

const consoleSrc = fs.readFileSync(
  path.join(root, "src/components/dev/owner-incident-console.tsx"),
  "utf8",
);
if (!consoleSrc.includes("setIncidents(readOwnerIncidents())")) {
  errors.push("owner-incident-console: missing incident refresh");
}
if (consoleSrc.includes("syncDiagnosticsToOwnerIncidents();\n      setIncidents")) {
  errors.push("owner-incident-console: listener must not call syncDiagnosticsToOwnerIncidents");
}

const immersive = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);
const pollEffect = immersive.match(
  /React\.useEffect\(\(\) => \{[\s\S]*?preview\/import-status[\s\S]*?\}, \[([^\]]*)\]\)/,
);
if (pollEffect?.[1]?.includes("previewRuntime")) {
  errors.push("immersive-workspace: preview poll effect must not list previewRuntime in deps");
}

if (errors.length) {
  console.error("verify:preview-no-recursion FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:preview-no-recursion OK");
