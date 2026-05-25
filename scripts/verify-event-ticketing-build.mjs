#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prompt =
  "Build an event ticketing app with event listings, Stripe payments, QR code tickets, and organizer check-in dashboard.";

const script = `
import { classifyAppArchetype } from "./src/lib/build/app-archetype-classifier.ts";
import { buildDesignBrief } from "./src/lib/build/design-brief-generator.ts";
const a = classifyAppArchetype(${JSON.stringify(prompt)});
if (a.id !== "event_ticketing") throw new Error("expected event_ticketing got " + a.id);
const brief = buildDesignBrief({ buildIntent: ${JSON.stringify(prompt)}, archetype: a, appName: "TicketHub", planPages: ["events","tickets","check-in"] });
if (brief.routes.length < 5) throw new Error("event ticketing needs rich routes");
if (!brief.promptBlock.includes("QR")) throw new Error("brief missing ticketing context");
console.log("event ticketing archetype ok routes=" + brief.routes.length);
`;

const r = spawnSync("npx", ["tsx", "--eval", script], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim());
