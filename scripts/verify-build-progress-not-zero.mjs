#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(root, "src/lib/build/build-job-events.ts", ["job_created: 1", "progressPercent: 1"], errors);
mustInclude(root, "src/lib/build/build-job-events.ts", ["EVENT_PROGRESS_FLOOR", "understanding_request: 5"], errors);
mustInclude(root, "src/hooks/use-build-job-progress.ts", ["Math.max", "1"], errors);

finish("verify:build-progress-not-zero", errors);
