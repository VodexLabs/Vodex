import { test, expect } from "@playwright/test";
import { waitForBuilderShell } from "./helpers/create-shell-failure";
import {
  visibleComposerTextarea,
  visibleSubmitButton,
  waitForComposerReady,
} from "./helpers/create-submit-assert";
import { syncComposerTextarea } from "./helpers/sync-composer-textarea";

const VALID = "Build a small inventory tracker for a cafe.";

test.describe("Create shell — headless", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  test.use({
    viewport: { width: 1280, height: 900 },
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (page.url().includes("/auth/login")) {
      test.skip(true, "Requires .playwright-auth.json");
    }
  });

  test("shows builder-shell within 20s on cold load", async ({ page, request }) => {
    const shell = await waitForBuilderShell(page, request, 20_000);
    expect(shell.ok).toBeTruthy();
  });

  test("textarea exists and is visible", async ({ page, request }) => {
    await waitForBuilderShell(page, request, 20_000);
    const textarea = visibleComposerTextarea(page);
    await expect(textarea).toBeVisible({ timeout: 5_000 });
  });

  test("no full-page spinner hides composer", async ({ page, request }) => {
    await waitForBuilderShell(page, request, 20_000);
    const onlySpinner = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="builder-shell"]');
      const ta = document.querySelector('[data-testid="create-prompt-textarea"]');
      return Boolean(shell && ta);
    });
    expect(onlySpinner).toBeTruthy();
  });

  test("onboarding route does not replace composer shell", async ({ page, request }) => {
    await waitForBuilderShell(page, request, 20_000);
    expect(page.url()).toContain("/create");
    await expect(visibleComposerTextarea(page)).toBeVisible();
  });

  test("valid text enables submit button", async ({ page, request }) => {
    await waitForComposerReady(page, 90_000);
    const textarea = visibleComposerTextarea(page);
    const submit = visibleSubmitButton(page);
    await syncComposerTextarea(textarea, VALID);
    await expect(submit).toHaveAttribute("data-has-text", "true", { timeout: 5_000 });
    await expect(submit).toHaveAttribute("data-disabled-reason", "none");
  });
});
