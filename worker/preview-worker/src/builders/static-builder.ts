import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { WorkspaceFile } from "../sandbox.js";
import { norm } from "../sandbox.js";
import { injectPreviewEnvShims, detectLegacy } from "../adapters/base44-adapter.js";

export async function buildStatic(
  root: string,
  files: WorkspaceFile[],
): Promise<{ ok: true; outputDir: string; logs: string } | { ok: false; logs: string; blockedReason: string }> {
  const index = files.find((f) => norm(f.path) === "index.html" || norm(f.path).endsWith("/index.html"));
  if (!index) {
    return { ok: false, logs: "no index.html", blockedReason: "Static preview requires index.html" };
  }
  const legacy = detectLegacy(files);
  let html = index.content;
  if (!html.includes("<html")) html = `<!DOCTYPE html><html><body>${html}</body></html>`;
  html = injectPreviewEnvShims(html, legacy);
  const outDir = path.join(root, "__static_out");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");
  return { ok: true, outputDir: outDir, logs: "static:index.html" };
}
