#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { cookiesHeader, getBaseUrl, readAuthFile } from "./lib/e2e-live.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(root, ".manual-qa-partial-credits.json");
const outDir = path.join(root, "tests/e2e/evidence");
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const projectId = evidence.latestJob?.project_id;
const baseUrl = getBaseUrl();
const auth = readAuthFile();
const cookie = cookiesHeader(auth.json);

if (!projectId || !cookie) {
  console.error("Need projectId in evidence and auth cookies");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: baseUrl });
const cookies = auth.json.cookies.map((c) => ({
  name: c.name,
  value: c.value,
  domain: c.domain?.replace(/^\./, "") ?? "localhost",
  path: c.path ?? "/",
}));
await context.addCookies(cookies);
const page = await context.newPage();
await page.goto(`/create?projectId=${projectId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(3000);
const shot = path.join(outDir, "manual-qa-partial-build-ui.png");
await page.screenshot({ path: shot, fullPage: false });
console.log("screenshot:", shot);
await browser.close();
