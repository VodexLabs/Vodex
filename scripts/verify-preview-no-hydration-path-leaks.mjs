#!/usr/bin/env node
/**
 * P1.3.33 — fixture: sanitizer clears hydration/bootstrap leaks.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const fixture = `<!DOCTYPE html><html><head><script id="__NEXT_DATA__" type="application/json">{"page":"/api/projects/abc-00000000-0000-4000-8000-000000000001/preview-html","asPath":"/api/projects/abc-00000000-0000-4000-8000-000000000001/preview-html"}</script></head><body><script>self.__next_f.push([1,"api/projects/abc-00000000-0000-4000-8000-000000000001/preview-html"])</script></body></html>`;

const runner = `
import { sanitizePreviewBootstrapState, assertPreviewBootstrapClean, countHydrationPathLeaks } from "../src/lib/preview/preview-bootstrap-sanitizer.ts";
const projectId = "abc-00000000-0000-4000-8000-000000000001";
const before = ${JSON.stringify(fixture)};
const after = sanitizePreviewBootstrapState(before, projectId, "/");
const assertResult = assertPreviewBootstrapClean(after, projectId);
if (!assertResult.ok) {
  console.error("FAIL leaks remain", assertResult);
  process.exit(1);
}
if (countHydrationPathLeaks(after, projectId, false) > 0) {
  console.error("FAIL hydration paths remain");
  process.exit(1);
}
console.log("OK");
`;

const tmp = path.join(root, "scripts", ".tmp-verify-hydration.ts");
fs.writeFileSync(tmp, runner);
const r = spawnSync("npx", ["tsx", tmp], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
fs.unlinkSync(tmp);

if (r.status !== 0) {
  console.error("✗ verify:preview-no-hydration-path-leaks");
  console.error(r.stdout, r.stderr);
  process.exit(1);
}
console.log("✓ verify:preview-no-hydration-path-leaks");
