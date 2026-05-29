import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

export const BUILD_STRATEGY_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/build-strategy-failure.json",
);

export type BuildStrategyAssertResult = {
  ok: boolean;
  buildStrategy: string | null;
  mode: string | null;
  planFirstEnabled: string | null;
  canEnqueueBuild: string | null;
};

function readAttr(page: Page, name: string): Promise<string | null> {
  const form = page.locator('[data-testid="create-composer-form"]');
  const btn = page.getByTestId("create-submit-button");
  return form
    .getAttribute(`data-${name}`)
    .catch(() => btn.getAttribute(`data-${name}`).catch(() => null));
}

export async function readBuildStrategyState(page: Page): Promise<BuildStrategyAssertResult> {
  const [buildStrategy, mode, planFirstEnabled, canEnqueueBuild] = await Promise.all([
    readAttr(page, "build-strategy"),
    readAttr(page, "mode"),
    readAttr(page, "plan-first-enabled"),
    readAttr(page, "can-enqueue-build"),
  ]);
  const ok =
    buildStrategy === "build_now" &&
    mode === "build" &&
    planFirstEnabled === "false" &&
    canEnqueueBuild === "true";
  return { ok, buildStrategy, mode, planFirstEnabled, canEnqueueBuild };
}

export async function assertRestaurantBuildNowBeforeSubmit(
  page: Page,
  promptLength: number,
): Promise<BuildStrategyAssertResult> {
  const state = await readBuildStrategyState(page);
  if (state.ok) return state;

  const submit = page.getByTestId("create-submit-button");
  const submitAttrs: Record<string, string | null> = {};
  for (const key of [
    "build-strategy",
    "mode",
    "plan-first-enabled",
    "can-enqueue-build",
    "disabled-reason",
    "has-text",
    "disabled",
  ]) {
    submitAttrs[key] = await submit.getAttribute(`data-${key}`).catch(() => null);
  }

  const storage = await page
    .evaluate(() => ({
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
      buildFlags: Object.keys(localStorage).filter((k) =>
        /dreamos|build|plan|strategy|composer/i.test(k),
      ),
    }))
    .catch(() => ({ localStorageKeys: [], sessionStorageKeys: [], buildFlags: [] }));

  const screenshotPath = path.join(process.cwd(), "tests/e2e/evidence/build-strategy-failure.png");
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  const payload = {
    capturedAt: new Date().toISOString(),
    stage: "build_strategy",
    url: page.url(),
    textarea_value_length: promptLength,
    selected_mode: state.mode,
    build_strategy: state.buildStrategy,
    plan_first_enabled: state.planFirstEnabled,
    can_enqueue_build: state.canEnqueueBuild,
    submit_button_attrs: submitAttrs,
    local_storage_keys: storage.localStorageKeys,
    session_storage_keys: storage.sessionStorageKeys,
    build_related_storage_keys: storage.buildFlags,
    screenshot_path: screenshotPath,
    console_errors: [] as string[],
  };

  fs.mkdirSync(path.dirname(BUILD_STRATEGY_FAILURE_PATH), { recursive: true });
  fs.writeFileSync(BUILD_STRATEGY_FAILURE_PATH, JSON.stringify(payload, null, 2));

  return state;
}
