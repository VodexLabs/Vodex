#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const must = (p, n) => {
  if (!fs.readFileSync(path.join(root, p), "utf8").includes(n)) {
    console.error("✗", p, n);
    process.exit(1);
  }
  console.log("✓", n);
};
must("supabase/migrations/20260520120000_build_job_events.sql", "build_job_events");
must("src/lib/build/build-job-events.ts", "writing_file");
must("src/app/api/projects/[id]/build-jobs/[jobId]/events/route.ts", "build_job_events");
must("src/lib/build/execute-staged-build-job.ts", "onWorkflowEvent");
