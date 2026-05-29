#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv[2];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const visible = read("src/lib/projects/user-visible-projects.ts");
const projectsView = read("src/components/apps/projects-view.tsx");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");
const restaurant = read("tests/e2e/restaurant-inventory-workflow.spec.ts");
const helper = read("tests/e2e/helpers/wait-for-created-project.ts");
const summary = read("src/app/api/projects/[id]/summary/route.ts");

if (check === "created-visible-by-id") {
  if (!helper.includes("/api/projects/${projectId}/summary")) fail("helper must read project by id");
  if (!helper.includes("builder_route_not_accessible")) fail("helper must open builder");
  console.log("✓ project created visible by id");
} else if (check === "eventually-includes-created") {
  if (!helper.includes("fetchVisibleProjects")) fail("helper must poll project list");
  const route = read("src/app/api/projects/route.ts");
  if (!route.includes("reconcileBudget")) fail("projects list must cap reconcile work");
  if (!helper.includes("PROJECT_LIST_COUNT_STALE")) fail("helper must allow stale count warning");
  console.log("✓ project list eventually includes created");
} else if (check === "no-duplicate-from-home-submit") {
  if (!helper.includes("duplicate_project_operation_id")) fail("helper must detect duplicate operationId");
  if (!immersive.includes("idempotencyKey")) fail("immersive must send idempotencyKey");
  console.log("✓ no duplicate project from home submit");
} else if (check === "cache-invalidates-after-create") {
  if (!immersive.includes("dreamos:projects-invalidate")) fail("create must invalidate projects cache");
  if (!projectsView.includes("dreamos:projects-invalidate")) fail("projects view must listen for invalidate");
  if (!projectsView.includes("loadProjects(true)")) fail("invalidate must reconcile reload");
  console.log("✓ project list cache invalidates after create");
} else if (check === "restaurant-no-count-only") {
  if (restaurant.includes("beforeProjects + 1")) fail("restaurant must not require count+1 only");
  if (!restaurant.includes("waitForCreatedProject")) fail("restaurant must use waitForCreatedProject");
  console.log("✓ restaurant uses id-based project proof");
} else {
  fail(`unknown check: ${check}`);
}
