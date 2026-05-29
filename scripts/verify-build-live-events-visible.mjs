#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(root, "src/components/create/workspace/build-live-progress.tsx", ["BuildLiveProgress", "progress.events"], errors);
mustInclude(root, "src/components/create/workspace/build-live-progress.tsx", ["FileActivityLine"], errors);

finish("verify:build-live-events-visible", errors);
