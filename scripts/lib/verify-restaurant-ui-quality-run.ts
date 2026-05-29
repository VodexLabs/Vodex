import { mergeRestaurantInventoryScaffold } from "../../src/lib/build/restaurant-inventory-scaffold";
import { checkGeneratedUiQuality } from "../../src/lib/build/generated-ui-quality-checker";
import { PREVIEW_READY_MIN_SCORE } from "../../src/lib/build/ui-quality-contract";

const files = mergeRestaurantInventoryScaffold([]);
const q = checkGeneratedUiQuality({
  files,
  appType: "saas_dashboard",
  routeMap: ["/", "/inventory", "/suppliers", "/alerts", "/settings"],
});

if (q.score < PREVIEW_READY_MIN_SCORE || !q.passesPreview) {
  console.error(`✗ restaurant scaffold UI quality ${q.score} (need ${PREVIEW_READY_MIN_SCORE})`, q.failures);
  process.exit(1);
}
console.log(`✓ restaurant UI quality ${q.score} >= ${PREVIEW_READY_MIN_SCORE}`);
