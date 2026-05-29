import { applyArchetypeScaffoldFallback } from "@/lib/build/archetype-scaffold-fallback";
import { evaluatePostBuildContract } from "@/lib/build/post-build-contract";
import { countComponentFiles } from "@/lib/build/import-graph";
import { countRenderablePages } from "@/lib/build/generated-file-utils";

const empty = applyArchetypeScaffoldFallback("restaurant_inventory", []);
if (!empty.usedFallback || empty.afterCount < 8) {
  console.error("✗ empty restaurant build must apply scaffold with >= 8 files", empty);
  process.exit(1);
}

if (empty.componentCount < 5 || empty.pageCount < 5) {
  console.error("✗ restaurant scaffold must have >= 5 components and pages", empty);
  process.exit(1);
}

const contract = evaluatePostBuildContract({
  files: empty.files,
  appName: "Bistro Stock",
  hasIcon: true,
  tier: "standard",
  appType: "saas_dashboard",
  projectId: "00000000-0000-4000-8000-000000000001",
  ownerId: "00000000-0000-4000-8000-000000000002",
  requiredPageSlugs: ["dashboard", "inventory", "suppliers", "alerts", "settings"],
  scaffoldFallbackUsed: true,
});

if (!contract.passed) {
  console.error("✗ restaurant scaffold must pass post-build contract", contract.failures);
  process.exit(1);
}

if (contract.uiQuality.score < 85) {
  console.error(`✗ restaurant scaffold ui quality ${contract.uiQuality.score} < 85`);
  process.exit(1);
}

const components = countComponentFiles(empty.files);
const pages = countRenderablePages(empty.files);
console.log(
  `✓ restaurant scaffold meets contract (${empty.afterCount} files, ${components} components, ${pages} pages, ui=${contract.uiQuality.score})`,
);
