import { test, expect } from "@playwright/test";
import {
  gotoWorkspaceComposer,
  visibleComposerTextarea,
  visibleSubmitButton,
  waitForComposerReady,
} from "./helpers/create-submit-assert";
import { syncComposerTextarea } from "./helpers/sync-composer-textarea";

const VALID_PROMPT = "Build a small inventory tracker for a cafe.";

async function gotoCreateBuild(page: import("@playwright/test").Page) {
  await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (page.url().includes("/auth/login")) {
    test.skip(true, "Requires .playwright-auth.json — run npm run setup:e2e-auth");
  }
  await waitForComposerReady(page, 90_000);
  return {
    textarea: visibleComposerTextarea(page),
    submit: visibleSubmitButton(page),
  };
}

async function expectDisabledReason(
  submit: import("@playwright/test").Locator,
  reason: string,
) {
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("data-disabled-reason", reason);
  await expect(submit).toHaveAttribute("data-has-text", "false");
}

async function expectSubmitEnabled(submit: import("@playwright/test").Locator) {
  await expect(submit).toHaveAttribute("data-has-text", "true", { timeout: 3_000 });
  await expect(submit).toHaveAttribute("data-disabled-reason", "none", { timeout: 3_000 });
  await expect(submit).toBeEnabled({ timeout: 3_000 });
}

test.describe("Create submit enablement", () => {
  test.setTimeout(120_000);
  test.use({ viewport: { width: 1280, height: 900 } });

  test("empty input → button disabled", async ({ page }) => {
    const { textarea, submit } = await gotoCreateBuild(page);
    await syncComposerTextarea(textarea, "");
    await expectDisabledReason(submit, "empty");
  });

  test("spaces only → button disabled", async ({ page }) => {
    const { textarea, submit } = await gotoCreateBuild(page);
    await syncComposerTextarea(textarea, "   \n\n  ");
    await expectDisabledReason(submit, "empty");
  });

  test("fill valid text → button enabled", async ({ page }) => {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const { textarea, submit } = await gotoWorkspaceComposer(page);
    await syncComposerTextarea(textarea, VALID_PROMPT);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("dreamos:composer-sync")));
    await expect(textarea).toHaveValue(VALID_PROMPT);
    await expectSubmitEnabled(submit);
  });

  test("paste valid text → button enabled", async ({ page, context }) => {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const { textarea, submit } = await gotoWorkspaceComposer(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await syncComposerTextarea(textarea, "");
    await page.evaluate((text) => navigator.clipboard.writeText(text), VALID_PROMPT);
    await textarea.click();
    await page.keyboard.press("Control+V");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("dreamos:composer-sync")));
    await expect(textarea).toHaveValue(VALID_PROMPT, { timeout: 5_000 });
    await expectSubmitEnabled(submit);
  });

  test("pressSequentially valid text → button enabled", async ({ page }) => {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const { textarea, submit } = await gotoWorkspaceComposer(page);
    await syncComposerTextarea(textarea, "");
    await textarea.click();
    await textarea.pressSequentially(VALID_PROMPT, { delay: 2 });
    await page.dispatchEvent("body", "dreamos:composer-sync");
    await expect.poll(async () => textarea.inputValue()).toContain("inventory");
    await expectSubmitEnabled(submit);
  });

  test("Enter with empty input does not submit", async ({ page }) => {
    const { textarea, submit } = await gotoCreateBuild(page);
    await syncComposerTextarea(textarea, "");
    await expect(submit).toBeDisabled();
    const before = page.url();
    await textarea.press("Enter");
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("data-disabled-reason", "empty");
    await expect
      .poll(async () => (await textarea.inputValue()).trim().length)
      .toBe(0);
  });

  test("Enter with valid input submits once", async ({ page }) => {
    await page.goto("/create?mode=build", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const { textarea, submit } = await gotoWorkspaceComposer(page);
    await syncComposerTextarea(textarea, VALID_PROMPT);
    await expectSubmitEnabled(submit);
    await textarea.press("Enter");
    await expect
      .poll(async () => (await textarea.inputValue()).trim().length)
      .toBe(0);
    await expect(page.getByText(VALID_PROMPT.slice(0, 20), { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
