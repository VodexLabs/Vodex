import { restaurantInventoryScaffoldFiles } from "@/lib/build/restaurant-inventory-scaffold";
import { filterRenderableBuildFiles } from "@/lib/build/generated-file-utils";
import { countComponentFiles } from "@/lib/build/import-graph";
import { evaluatePostBuildContract } from "@/lib/build/post-build-contract";
import { requiredPageSlugsForArchetype } from "@/lib/build/post-build-contract";
import { archetypeToLegacyAppType } from "@/lib/build/app-archetype-classifier";

const files = restaurantInventoryScaffoldFiles();
const slugs = requiredPageSlugsForArchetype("restaurant_inventory") ?? [];
const contract = evaluatePostBuildContract({
  files,
  appName: "InvntryPro",
  hasIcon: true,
  requiredPageSlugs: slugs,
  tier: "standard",
  projectId: "00000000-0000-4000-8000-000000000001",
  ownerId: "00000000-0000-4000-8000-000000000002",
  appType: archetypeToLegacyAppType("restaurant_inventory"),
});

const renderable = filterRenderableBuildFiles(files);
if (!contract.passed) {
  console.error("✗ restaurant scaffold contract failed:", contract.failures.join("; "));
  process.exit(1);
}
if (renderable.length < 8) {
  console.error(`✗ renderable files ${renderable.length} < 8`);
  process.exit(1);
}

const paths = renderable.map((f) => f.path.toLowerCase()).join("\n");
for (const slug of ["dashboard", "inventory", "suppliers", "alerts", "settings"]) {
  if (!paths.includes(slug) && slug !== "dashboard") {
    const hasRoute = paths.includes(`app/${slug}/`);
    if (!hasRoute) {
      console.error(`✗ missing route slug ${slug}`);
      process.exit(1);
    }
  }
}

const componentCount = countComponentFiles(renderable);
if (componentCount < 5) {
  console.error(`✗ components ${componentCount} < 5`);
  process.exit(1);
}

const main = renderable.find((f) => /^app\/page\.(tsx|jsx)$/i.test(f.path.replace(/\\/g, "/")));
if (!main?.content?.trim() || main.content.trim().length < 40) {
  console.error("✗ main route empty or too short");
  process.exit(1);
}

console.log(`✓ restaurant scaffold: ${renderable.length} files, ${componentCount} components, contract passed`);
