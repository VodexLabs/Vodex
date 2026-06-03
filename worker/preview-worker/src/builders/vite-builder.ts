import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FrameworkInfo } from "../framework.js";
import { resolveOutputDir } from "../sandbox.js";
import { npmInstall, npmRunBuild } from "./run-command.js";
import { injectPreviewEnvShims, detectLegacy } from "../adapters/base44-adapter.js";
import type { WorkspaceFile } from "../sandbox.js";

export async function buildVite(
  root: string,
  framework: FrameworkInfo,
  files: WorkspaceFile[],
): Promise<
  | { ok: true; outputDir: string; logs: string }
  | { ok: false; logs: string; blockedReason: string }
> {
  let logs = "";
  const install = await npmInstall(root, framework.packageManager);
  logs += `[install]\n${install.logs}\n`;
  if (!install.ok) {
    return {
      ok: false,
      logs,
      blockedReason: "Dependency install failed — set PREVIEW_ALLOW_NPM_SCRIPTS=1 if postinstall is required",
    };
  }
  const build = await npmRunBuild(root, framework.packageManager, framework.scripts.build ? "build" : "build");
  logs += `[build]\n${build.logs}\n`;
  if (!build.ok) {
    return { ok: false, logs, blockedReason: "Vite build failed" };
  }
  const outKey = framework.id === "cra" ? "cra" : "vite";
  const outDir = resolveOutputDir(outKey, root);
  const indexPath = path.join(outDir, "index.html");
  try {
    let html = await fs.readFile(indexPath, "utf8");
    html = injectPreviewEnvShims(html, detectLegacy(files));
    await fs.writeFile(indexPath, html, "utf8");
  } catch {
    return { ok: false, logs: `${logs}\nMissing dist/index.html`, blockedReason: "Build output missing index.html" };
  }
  return { ok: true, outputDir: outDir, logs };
}
