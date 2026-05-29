#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "src/app/(workspace)/create/page.tsx"), "utf8");
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");
const bridge = fs.readFileSync(
  path.join(root, "src/components/create/create-composer-ready-bridge.tsx"),
  "utf8",
);
const immersive = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);

const errors = [];
if (!entry.includes("needsRedirectBootstrap")) {
  errors.push("create-workspace-entry must gate redirect bootstrap");
}
if (!entry.includes("ImmersiveWorkspace") || entry.includes('dynamic(')) {
  errors.push("create entry must static-import ImmersiveWorkspace (no dynamic block)");
}
if (!immersive.includes('data-testid="create-prompt-textarea"')) {
  errors.push("missing create-prompt-textarea");
}
if (!immersive.includes('data-testid="create-submit-button"')) {
  errors.push("missing create-submit-button");
}
if (!bridge.includes('data-testid="create-composer-ready"')) {
  errors.push("missing create-composer-ready marker in bridge");
}
if (!entry.includes("CreateComposerReadyBridge")) {
  errors.push("create entry must mount CreateComposerReadyBridge");
}
if (!bridge.includes("data-disabled-reason") || !bridge.includes("data-live-len")) {
  errors.push("composer ready bridge must probe submit debug attrs");
}
if (!bridge.includes("data-reason")) {
  errors.push("composer ready marker must expose data-reason");
}
if (!bridge.includes("evaluateComposerReadiness")) {
  errors.push("composer ready must use evaluateComposerReadiness");
}
if (entry.includes("onReadyChange")) {
  errors.push("create entry must not use callback-based composer readiness");
}
if (page.includes("Suspense") && page.includes("Loader2")) {
  errors.push("create page must not use Suspense spinner fallback");
}
if (!fs.existsSync(path.join(root, "src/components/create/create-server-composer-island.tsx"))) {
  errors.push("missing create-server-composer-island");
}
if (!fs.existsSync(path.join(root, "src/components/create/create-page-body.tsx"))) {
  errors.push("missing create-page-body");
}
if (!immersive.includes("data-dom-len") || !immersive.includes("data-state-len")) {
  errors.push("missing submit debug length attributes");
}
if (!immersive.includes('data-testid="builder-shell"')) {
  errors.push("missing builder-shell");
}
if (!immersive.includes('data-testid="build-mode-active"')) {
  errors.push("missing build-mode-active");
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ create page interactive test IDs and immediate shell path");
