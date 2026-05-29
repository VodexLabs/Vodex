#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
finish(
  "verify:empty-prompt-no-send",
  (() => {
    const e = [];
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["canSendPrompt", "composerHasText"], e);
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["notifySubmitBlocked", "composerHasText", "disabled={!canSendPrompt}"], e);
    return e;
  })(),
);
