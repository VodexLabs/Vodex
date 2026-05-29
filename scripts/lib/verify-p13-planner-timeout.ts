import {
  buildDeterministicPlanForArchetype,
  deterministicPlanToJson,
} from "@/lib/build/deterministic-archetype-plan";
import { classifyAppArchetype } from "@/lib/build/app-archetype-classifier";
import { applyArchetypeScaffoldFallback } from "@/lib/build/archetype-scaffold-fallback";

const prompt =
  "Build a restaurant inventory app with dashboard, inventory, suppliers, low-stock alerts, and settings.";

const archetype = classifyAppArchetype(prompt);
if (archetype.id !== "restaurant_inventory") {
  console.error("✗ expected restaurant_inventory", archetype.id);
  process.exit(1);
}

const plan = buildDeterministicPlanForArchetype(archetype, prompt);
const json = deterministicPlanToJson(plan);
if (!json.includes("inventory")) {
  console.error("✗ deterministic plan missing inventory");
  process.exit(1);
}

const scaffold = applyArchetypeScaffoldFallback(archetype.id, []);
if (!scaffold.usedFallback || scaffold.afterCount < 8) {
  console.error("✗ scaffold after planner-less path", scaffold);
  process.exit(1);
}

console.log(`✓ restaurant continues after planner timeout path (${scaffold.afterCount} files)`);
