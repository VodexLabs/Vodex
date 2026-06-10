#!/usr/bin/env npx tsx
/**
 * Inspect served preview HTML for inner Next router bootstrap issues.
 * Usage: npm run debug:preview-inner-route -- --project <uuid>
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { downloadPreviewArtifactFile, PREVIEW_ARTIFACTS_BUCKET } from "../src/lib/imports/preview-artifact-storage";
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html";
import {
  detectInnerRouteBootstrapIssues,
  innerRouteBootstrapLikelyBroken,
} from "../src/lib/preview/detect-inner-route-bootstrap";
import {
  countHydrationPathLeaks,
  formatBootstrapLeakReport,
  sanitizePreviewBootstrapState,
  scanBootstrapLeaksDetailed,
} from "../src/lib/preview/preview-bootstrap-sanitizer";
import { TEXT_ARTIFACT_EXT } from "../src/lib/preview/preview-path-leak-scanner";

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

async function listArtifactFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  artifactPath: string,
): Promise<string[]> {
  const out: string[] = [];
  async function walk(folder: string) {
    const { data, error } = await admin.storage.from(PREVIEW_ARTIFACTS_BUCKET).list(folder, { limit: 500 });
    if (error || !data) return;
    for (const ent of data) {
      const rel = folder ? `${folder}/${ent.name}` : ent.name;
      if (ent.id == null) await walk(rel);
      else out.push(rel.replace(`${artifactPath}/`, "").replace(/^\/+/, ""));
    }
  }
  await walk(artifactPath);
  return out;
}

function printLeaks(label: string, text: string, file?: string) {
  const leaks = scanBootstrapLeaksDetailed(text, projectId, {
    excludePlatformInjections: label === "served_html",
    file,
  });
  const hydration = countHydrationPathLeaks(text, projectId, label === "served_html");
  console.log(`\n${label} (${file ?? "document"}) — unsafe: ${leaks.length}, hydration: ${hydration}`);
  for (const leak of leaks) {
    console.log(`  [${leak.source}] ${leak.pattern} @${leak.index}`);
    console.log(`    ${leak.snippet}`);
  }
}

async function main() {
  const envLocal = loadEnvLocal();
  Object.assign(process.env, envLocal);
  if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";
  const env = { ...process.env, ...envLocal };
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

  const files = await listArtifactFiles(admin, artifactPath);
  for (const rel of files.filter((f) => TEXT_ARTIFACT_EXT.test(f)).slice(0, 8)) {
    const raw = await downloadPreviewArtifactFile({ admin, artifactPath, relativePath: rel });
    if (!raw) continue;
    const stored = raw.data.toString("utf8");
    const sanitized = sanitizePreviewBootstrapState(stored, projectId, "/", {
      rewriteAssetUrls: !/\.m?js$/i.test(rel),
    });
    if (sanitized !== stored) {
      console.log(formatBootstrapLeakReport({
        before: stored,
        after: sanitized,
        projectId,
        label: `sanitizer ${rel}`,
        file: rel,
      }));
    }
    printLeaks("stored_html", stored, rel);
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
  const issues = detectInnerRouteBootstrapIssues(servedHtml, projectId);

  console.log(`\nstored_html_bytes: ${storedHtml.length}`);
  console.log(`served_html_bytes: ${servedHtml.length}`);
  console.log(`bootstrap_likely_broken: ${innerRouteBootstrapLikelyBroken(servedHtml, projectId)}`);
  console.log(`has_virtual_history_shim: ${servedHtml.includes("vodex-preview-virtual-history")}`);
  console.log(`has_inner_watchdog: ${servedHtml.includes("vodex-preview-inner-watchdog")}`);
  console.log(`has_prehydration_rewrite: ${servedHtml.includes("vodex-prehydration-location-rewrite")}`);

  const headChunk = servedHtml.match(/<head[^>]*>[\s\S]{0,8000}/i)?.[0] ?? servedHtml.slice(0, 8000);
  const scriptTags = [...headChunk.matchAll(/<(script|link)[^>]*>/gi)].slice(0, 20);
  console.log("\nFirst script/link tags in served HTML head:");
  for (const [i, m] of scriptTags.entries()) {
    console.log(`  ${i + 1}. ${m[0].slice(0, 120)}`);
  }
  const preIdx = servedHtml.indexOf("vodex-prehydration-location-rewrite");
  const nextScriptIdx = servedHtml.search(/<script[^>]*(?:_next|__next)/i);
  console.log(
    `prehydration_before_next_scripts: ${preIdx >= 0 && (nextScriptIdx < 0 || preIdx < nextScriptIdx)}`,
  );

  printLeaks("served_html", servedHtml, "index.html");

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
