import { restaurantInventoryScaffoldFiles } from "@/lib/build/restaurant-inventory-scaffold";
import { buildStaticPreviewHtml } from "@/lib/preview/static-preview-builder";

const html = buildStaticPreviewHtml(restaurantInventoryScaffoldFiles());
if (!html?.trim() || html.includes("No renderable content")) {
  console.error("✗ empty preview html");
  process.exit(1);
}
if (!html.includes("dreamos-preview")) {
  console.error("✗ missing preview marker");
  process.exit(1);
}
if (!html.includes('data-testid="generated-app-preview-root"')) {
  console.error("✗ missing generated-app-preview-root");
  process.exit(1);
}
if (!html.includes('data-testid="restaurant-dashboard"')) {
  console.error("✗ missing restaurant-dashboard marker");
  process.exit(1);
}
if (html.includes("No renderable content")) {
  console.error("✗ preview has no renderable content");
  process.exit(1);
}
console.log(`✓ preview html ${html.length} bytes`);
