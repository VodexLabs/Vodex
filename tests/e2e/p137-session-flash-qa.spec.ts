import { test, expect } from "./helpers/live-gate";
import { finalizeArtifact, writeP138Artifact, type P138StepResult } from "./helpers/p138-artifacts";
import { resolveImportedProjectId } from "./helpers/resolve-imported-project";

let projectId = "";
const steps: P138StepResult[] = [];
const authDebugEvents: unknown[] = [];

const ROUTE_DEFS: Array<{ id: string; label: string; path: (id: string) => string }> = [
  { id: "builder", label: "project builder", path: (id) => `/apps/${id}/builder` },
  { id: "preview", label: "preview", path: (id) => `/apps/${id}/builder?tab=preview` },
  { id: "dashboard", label: "dashboard", path: () => "/dashboard" },
  { id: "mobile", label: "mobile app", path: (id) => `/apps/${id}/builder?tab=mobile` },
  { id: "code", label: "code", path: (id) => `/apps/${id}/builder?tab=code` },
  { id: "settings", label: "settings", path: () => "/settings" },
];

test.describe.configure({ mode: "serial", timeout: 30_000 });

test.describe("P1.3.7 session flash QA @live", () => {
  test.beforeAll(async ({ request, liveGate }) => {
    test.setTimeout(25_000);
    if (!liveGate) return;
    const resolved = await resolveImportedProjectId(request);
    if (!resolved) throw new Error("No imported project for session flash QA");
    projectId = resolved.id;
  });

  test.beforeEach(async ({ page, liveGate }) => {
    if (!liveGate) return;
    await page.addInitScript(() => {
      window.addEventListener("auth_debug_event", ((e: Event) => {
        const detail = (e as CustomEvent).detail;
        (window as unknown as { __authDebugEvents?: unknown[] }).__authDebugEvents ??= [];
        (window as unknown as { __authDebugEvents: unknown[] }).__authDebugEvents.push(detail);
      }) as EventListener);
    });
  });

  test.afterAll(() => {
    writeP138Artifact("p137-session-flash-qa.json", finalizeArtifact(steps, projectId || null, { auth_debug_events: authDebugEvents }));
  });

  for (const route of ROUTE_DEFS) {
    test(`navigate — ${route.label}`, async ({ page, liveGate }, testInfo) => {
      if (!liveGate) return;
      try {
        const before = page.url();
        await page.goto(route.path(projectId), { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForTimeout(400);
        const after = page.url();
        expect(after).not.toMatch(/\/auth\/login/);
        expect(await page.getByText(/sign (out|in)|session expired/i).count()).toBe(0);
        const events =
          (await page.evaluate(() => (window as unknown as { __authDebugEvents?: unknown[] }).__authDebugEvents)) ?? [];
        authDebugEvents.push(...events);
        const screenshot = testInfo.outputPath(`flash-${route.id}.png`);
        try {
          await page.screenshot({ path: screenshot, timeout: 5_000 });
        } catch {
          /* optional */
        }
        steps.push({ id: route.id, pass: true, detail: `${before} -> ${after}`, screenshot });
      } catch (err) {
        steps.push({ id: route.id, pass: false, root_cause: String(err) });
        throw err;
      }
    });
  }
});
