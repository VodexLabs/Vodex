/**
 * Offline verification — deterministic scaffold selection for common app prompts.
 * Run: npm run verify:generated-app-scaffold
 */
import { classifyAppArchetype } from "../src/lib/build/app-archetype-classifier";
import {
  applyArchetypeScaffoldFallback,
  hasFullScaffoldTree,
  mergeScaffoldForArchetype,
} from "../src/lib/build/archetype-scaffold-fallback";
import { filterRenderableBuildFiles } from "../src/lib/build/generated-file-utils";
import { validateGeneratedApp } from "../src/lib/build/generated-app-validator";
import { evaluateSourceIntegrity } from "../src/lib/build/source-integrity-validator";
import { buildDesignBrief } from "../src/lib/build/design-brief-generator";

const MIN_MEANINGFUL_FILES = 6;

const CASES = [
  {
    id: "recipe",
    prompt:
      "Build a recipe app with meal planning, shopping list, and suggestions from on-hand ingredients.",
  },
  {
    id: "restaurant",
    prompt:
      "Restaurant inventory app for kitchen pantry, suppliers, stock alerts, and ingredient tracking.",
  },
  {
    id: "crm",
    prompt: "Nonprofit CRM for donors, donations, campaigns, and recurring gifts.",
  },
  {
    id: "saas_dashboard",
    prompt: "SaaS dashboard with analytics, KPI metrics, team settings, and growth charts.",
  },
  {
    id: "fitness",
    prompt: "Fitness app for workout tracking, habits, and wellness goals.",
  },
] as const;

type CaseResult = {
  id: string;
  prompt: string;
  archetype: string;
  scaffold_id: string;
  scaffold_applied: boolean;
  files_generated: number;
  package_json: boolean;
  root_page: boolean;
  source_integrity_ok: boolean;
  preview_route_ok: boolean;
  contract_ok: boolean;
  pass: boolean;
  failures: string[];
};

function hasRootPage(files: { path: string }[]): boolean {
  return files.some((f) => /^app\/page\.(tsx|jsx)$/i.test(f.path.replace(/\\/g, "/")));
}

function hasPackageJson(files: { path: string }[]): boolean {
  return files.some((f) => f.path.replace(/\\/g, "/") === "package.json");
}

function hasPreviewCandidateRoute(files: { path: string }[]): boolean {
  const paths = files.map((f) => f.path.replace(/\\/g, "/").toLowerCase());
  return (
    paths.some((p) => /^app\/page\.(tsx|jsx)$/.test(p)) ||
    paths.some((p) => /^app\/dashboard\/page\.(tsx|jsx)$/.test(p)) ||
    paths.some((p) => /^app\/[^/]+\/page\.(tsx|jsx)$/.test(p))
  );
}

function verifyCase(input: (typeof CASES)[number]): CaseResult {
  const archetype = classifyAppArchetype(input.prompt);
  const appName = "Scaffold Verify App";
  const beforeCount = 0;
  const merged = filterRenderableBuildFiles(mergeScaffoldForArchetype(archetype.id, [], appName));
  const fallback = applyArchetypeScaffoldFallback(archetype.id, [], appName);
  const files = fallback.files;
  const renderable = filterRenderableBuildFiles(files);
  const integrity = evaluateSourceIntegrity(files);
  const brief = buildDesignBrief({
    buildIntent: input.prompt,
    archetype,
    appName,
    planPages: archetype.coreRoutes.map((r) => r.replace(/^\//, "")),
  });
  const validation = validateGeneratedApp({
    files,
    projectId: "00000000-0000-4000-8000-000000000001",
    ownerId: "00000000-0000-4000-8000-000000000002",
    routeMap: brief.routes,
  });
  const failures: string[] = [];
  if (!hasFullScaffoldTree(archetype.id)) failures.push("archetype_missing_full_scaffold");
  if (renderable.length < MIN_MEANINGFUL_FILES) failures.push(`files_${renderable.length}_lt_${MIN_MEANINGFUL_FILES}`);
  if (!hasPackageJson(renderable)) failures.push("missing_package_json");
  if (!hasRootPage(renderable)) failures.push("missing_root_page");
  if (!integrity.sourceIntegrityOk) failures.push(`source_integrity:${integrity.blockedReason ?? "failed"}`);
  if (!hasPreviewCandidateRoute(renderable)) failures.push("missing_preview_route");
  if (!validation.ok) failures.push(...validation.reasons.slice(0, 5));

  return {
    id: input.id,
    prompt: input.prompt,
    archetype: archetype.id,
    scaffold_id: archetype.id,
    scaffold_applied: fallback.usedFallback || merged.length > beforeCount,
    files_generated: renderable.length,
    package_json: hasPackageJson(renderable),
    root_page: hasRootPage(renderable),
    source_integrity_ok: integrity.sourceIntegrityOk,
    preview_route_ok: hasPreviewCandidateRoute(renderable),
    contract_ok: validation.ok,
    pass: failures.length === 0,
    failures,
  };
}

function main() {
  const results = CASES.map(verifyCase);
  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    const mark = r.pass ? "✓" : "✗";
    console.log(
      `${mark} ${r.id}: archetype=${r.archetype} files=${r.files_generated} integrity=${r.source_integrity_ok}`,
    );
    if (!r.pass) console.log(`    failures: ${r.failures.join(", ")}`);
  }
  if (failed.length) {
    console.error(`\n✗ verify:generated-app-scaffold failed (${failed.length}/${results.length})`);
    process.exit(1);
  }
  console.log(`\n✓ verify:generated-app-scaffold passed (${results.length} prompts)`);
}

main();
