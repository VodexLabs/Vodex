#!/usr/bin/env node
/**
 * P1.3.30 inner-route 404 detection + repair gates.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const watchdog = read("src/lib/preview/inject-preview-inner-watchdog.ts");
const types = read("src/lib/preview/preview-inner-route-types.ts");
const panel = read("src/components/create/workspace/preview-panel.tsx");
const errorPanel = read("src/components/preview/preview-inner-route-error-panel.tsx");
const rewrite = read("src/lib/preview/rewrite-preview-artifact-html.ts");
const repair = read("src/lib/preview/preview-inner-route-repair.ts");
const repairRoute = read("src/app/api/projects/[id]/preview/inner-route-repair/route.ts");
const detect = read("src/lib/preview/detect-inner-route-bootstrap.ts");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");

const checks = {
  "preview-inner-404-detection": () => {
    assert(watchdog.includes("vodex-preview-inner-error"), "watchdog must postMessage");
    assert(watchdog.includes("inner_next_route_404"), "watchdog kind");
    assert(watchdog.includes("Page Not Found") || watchdog.includes("page not found"), "404 text");
    assert(watchdog.includes("could not be found in this application"), "Next 404 phrase");
    assert(watchdog.includes("api/projects/"), "platform path detection");
    assert(rewrite.includes("injectPreviewInnerWatchdog"), "rewrite injects watchdog");
    assert(types.includes("isPreviewInnerRouteErrorMessage"), "type guard");
    assert(panel.includes("isPreviewInnerRouteErrorMessage"), "panel listens");
    assert(panel.includes('addEventListener("message"'), "postMessage listener");
  },
  "preview-inner-error-ui": () => {
    assert(errorPanel.includes("Preview loaded, but the imported app routed to a missing page"), "title");
    assert(errorPanel.includes("preview-inner-route-error-panel"), "test id");
    assert(errorPanel.includes("Run inner-route repair"), "repair action");
    assert(errorPanel.includes("Clear preview cache"), "cache action");
    assert(errorPanel.includes("Rebuild artifact"), "rebuild action");
    assert(errorPanel.includes("Copy technical details"), "copy action");
    assert(errorPanel.includes("iframe URL"), "debug field");
    assert(errorPanel.includes("bad inner route"), "bad route field");
    assert(panel.includes("PreviewInnerRouteErrorPanel"), "panel wired");
    assert(panel.includes("showInnerRouteError"), "overlay state");
  },
  "preview-inner-route-repair": () => {
    assert(repair.includes("stripPreviewPlatformPathsFromText"), "sanitize artifact");
    assert(repair.includes("runProjectPreviewBuild"), "rebuild after repair");
    assert(repairRoute.includes("repairPreviewInnerRoute"), "API route");
    assert(immersive.includes("preview/inner-route-repair"), "client calls repair API");
    assert(immersive.includes("onInnerRouteRepair"), "passes handler to panel");
    assert(detect.includes("detectInnerRouteBootstrapIssues"), "bootstrap scanner");
    assert(fs.existsSync(path.join(root, "scripts/debug-preview-inner-route.ts")), "debug script");
  },
};

const mode = process.argv[2];
if (!mode || !checks[mode]) {
  console.error(`Usage: node scripts/verify-preview-inner-route.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}

try {
  checks[mode]();
  console.log(`verify:${mode} OK`);
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}
