import { mergeRestaurantInventoryScaffold, restaurantInventoryScaffoldFiles } from "../../src/lib/build/restaurant-inventory-scaffold";
import {
  evaluatePostBuildContract,
  requiredPageSlugsForArchetype,
} from "../../src/lib/build/post-build-contract";

const files = mergeRestaurantInventoryScaffold([]);
const slugs = requiredPageSlugsForArchetype("restaurant_inventory");
const contract = evaluatePostBuildContract({
  files,
  appName: "Pantry Pro",
  hasIcon: true,
  routeMap: ["/", "/inventory", "/suppliers", "/alerts", "/settings"],
  requiredPageSlugs: slugs,
  tier: "standard",
  projectId: "00000000-0000-4000-8000-000000000001",
  ownerId: "00000000-0000-4000-8000-000000000002",
  appType: "saas_dashboard",
});

const paths = files.map((f) => f.path);
const required = [
  "app/page.tsx",
  "app/inventory/page.tsx",
  "components/AppShell.tsx",
  "components/InventoryTable.tsx",
  "lib/mock-data.ts",
];
const missing = required.filter((p) => !paths.includes(p));
if (missing.length) {
  console.error("✗ scaffold missing:", missing.join(", "));
  process.exit(1);
}
if (!contract.passed) {
  console.error("✗ restaurant scaffold contract failed:", contract.failures.join("; "));
  process.exit(1);
}
if (restaurantInventoryScaffoldFiles().length < 12) {
  console.error("✗ scaffold too thin");
  process.exit(1);
}
console.log("✓ restaurant generation contract passes on scaffold");
