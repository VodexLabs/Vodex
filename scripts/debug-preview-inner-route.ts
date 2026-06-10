#!/usr/bin/env npx tsx
/**
 * Inspect served preview HTML for inner Next router bootstrap issues.
 * Usage: npm run debug:preview-inner-route -- --project <uuid>
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { downloadPreviewArtifactFile } from "../src/lib/imports/preview-artifact-writer";
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html";
import {
  detectInnerRouteBootstrapIssues,
  innerRouteBootstrapLikelyBroken,
} from "../src/lib/preview/detect-inner-route-bootstrap";
import { scanTextForPathLeaks } from "../src/lib/preview/preview-path-leak-scanner";

const root = path.join(process.cwd());

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const projectId = arg("--project", "ff55c353-aabf-479a-aaec-2138bba9d6b4");

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: project } = await admin
    .from("projects")
    .select("id, name, metadata")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    console.error("Project not found");
    process.exit(1);
  }

  const meta =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {};

  const artifactPath =
    typeof meta.preview_artifact_path === "string" ? meta.preview_artifact_path.trim() : "";
  const buildId = artifactPath.split("/").pop() ?? "unknown";

  console.log("Preview Inner Route Debug");
  console.log("=========================");
  console.log(`project: ${project.name ?? projectId}`);
  console.log(`artifact_path: ${artifactPath || "—"}`);

  if (!artifactPath) {
    console.error("No preview_artifact_path in metadata");
    process.exit(1);
  }

  const raw = await downloadPreviewArtifactFile({
    admin,
    artifactPath,
    relativePath: "index.html",
  });
  if (!raw) {
    console.error("index.html missing from artifact storage");
    process.exit(1);
  }

  const storedHtml = raw.data.toString("utf8");
  const servedHtml = rewritePreviewArtifactHtml(storedHtml, projectId, buildId, "/");
  const storedLeaks = scanTextForPathLeaks(storedHtml, projectId).filter((m) => !m.safe);
  const servedLeaks = scanTextForPathLeaks(servedHtml, projectId).filter((m) => !m.safe);
  const issues = detectInnerRouteBootstrapIssues(servedHtml, projectId);

  console.log(`stored_html_bytes: ${storedHtml.length}`);
  console.log(`served_html_bytes: ${servedHtml.length}`);
  console.log(`stored_unsafe_leaks: ${storedLeaks.length}`);
  console.log(`served_unsafe_leaks: ${servedLeaks.length}`);
  console.log(`bootstrap_likely_broken: ${innerRouteBootstrapLikelyBroken(servedHtml, projectId)}`);
  console.log(`has_virtual_history_shim: ${servedHtml.includes("vodex-preview-virtual-history")}`);
  console.log(`has_inner_watchdog: ${servedHtml.includes("vodex-preview-inner-watchdog")}`);

  if (storedLeaks.length) {
    console.log("\nStored artifact leaks (sample):");
    for (const leak of storedLeaks.slice(0, 5)) {
      console.log(`  - [${leak.pattern}] ${leak.snippet}`);
    }
  }

  if (issues.length) {
    console.log("\nBootstrap issues:");
    for (const issue of issues) {
      console.log(`  - [${issue.severity}] ${issue.id}: ${issue.message}`);
      if (issue.snippet) console.log(`      ${issue.snippet}`);
    }
  } else {
    console.log("\nNo bootstrap issues detected in served HTML.");
  }

  process.exit(innerRouteBootstrapLikelyBroken(servedHtml, projectId) ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
