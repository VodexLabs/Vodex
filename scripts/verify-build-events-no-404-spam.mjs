#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustExist(root, "src/lib/build/build-events-404-dedupe.ts", errors);
mustInclude(
  root,
  "src/app/api/projects/[id]/build-jobs/[jobId]/events/route.ts",
  ['"starting"', "job_not_found"],
  errors,
);
mustInclude(root, "src/hooks/use-build-job-progress.ts", ["notFoundAttempts", "reconnecting"], errors);

finish("verify:build-events-no-404-spam", errors);
